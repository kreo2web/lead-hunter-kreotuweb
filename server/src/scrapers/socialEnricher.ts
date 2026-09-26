import axios from 'axios';
import * as cheerio from 'cheerio';
import { cleanPhoneNumber } from './gmapsScraper.js';

export interface SocialEnrichmentResult {
  email: string | null;
  phone: string | null;
  cleanPhone: string | null;
  socialFacebook: string | null;
  socialInstagram: string | null;
  foundSources: string[];
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
const IGNORED_DOMAINS = [
  'sentry.io', 'wixpress.com', 'example.com', 'domain.com',
  'wordpress.org', 'cloudflare.com', 'googleapis.com', 'schema.org',
  'facebook.com', 'fb.com', 'instagram.com', 'twitter.com', 'tiktok.com'
];

function extractValidEmails(text: string): string[] {
  if (!text) return [];
  const matches = text.match(EMAIL_REGEX) || [];
  const cleanList: string[] = [];

  for (const raw of matches) {
    const email = raw.toLowerCase().trim();
    if (email.endsWith('.png') || email.endsWith('.jpg') || email.endsWith('.svg') || email.endsWith('.webp')) {
      continue;
    }
    const domain = email.split('@')[1];
    if (!domain || IGNORED_DOMAINS.some(d => domain.includes(d))) {
      continue;
    }
    if (!cleanList.includes(email)) {
      cleanList.push(email);
    }
  }
  return cleanList;
}

// Regex to capture potential phone numbers in bio or description text
const PHONE_PATTERN = /(?:\+?(\d{1,3}))?[-. (]*(\d{2,4})[-. )]*(\d{3,4})[-. ]*(\d{3,5})/g;

function extractPotentialPhones(text: string): string[] {
  if (!text) return [];
  const results: string[] = [];
  const matches = text.match(PHONE_PATTERN) || [];

  for (const m of matches) {
    const cleaned = cleanPhoneNumber(m);
    // Usually local/intl phone numbers have between 8 and 14 digits
    if (cleaned && cleaned.length >= 8 && cleaned.length <= 15) {
      if (!results.includes(m.trim())) {
        results.push(m.trim());
      }
    }
  }
  return results;
}

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
};

/**
 * Perform a web search on DuckDuckGo HTML to discover the social media profile of the business
 */
async function searchSocialProfileUrl(query: string, platform: 'facebook.com' | 'instagram.com'): Promise<string | null> {
  try {
    const fullQuery = `${query} site:${platform}`;
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(fullQuery)}`;

    const res = await axios.get(searchUrl, {
      headers: DEFAULT_HEADERS,
      timeout: 7000,
    });

    const $ = cheerio.load(res.data);
    let matchedUrl: string | null = null;

    $('a.result__url, a.result__snippet').each((_, el) => {
      if (matchedUrl) return;
      const href = $(el).attr('href') || '';
      // DuckDuckGo redirects often look like //duckduckgo.com/l/?uddg=https%3A%2F%2F...
      let actualUrl = href;
      if (href.includes('uddg=')) {
        try {
          const parsed = new URL('https:' + href);
          const target = parsed.searchParams.get('uddg');
          if (target) actualUrl = decodeURIComponent(target);
        } catch {
          // ignore
        }
      }

      if (actualUrl.includes(platform) && !actualUrl.includes('/sharer') && !actualUrl.includes('/share') && !actualUrl.includes('/directory')) {
        matchedUrl = actualUrl;
      }
    });

    return matchedUrl;
  } catch (err: any) {
    return null;
  }
}

/**
 * Inspect Facebook page for email and phone contact info
 */
async function inspectFacebookPage(url: string, userCookie?: string): Promise<{ email: string | null; phone: string | null }> {
  try {
    const headers: Record<string, string> = { ...DEFAULT_HEADERS };
    if (userCookie && userCookie.trim()) {
      headers['Cookie'] = userCookie.trim();
    }

    const res = await axios.get(url, { headers, timeout: 8000, validateStatus: () => true });
    if (res.status >= 400) return { email: null, phone: null };

    const html = typeof res.data === 'string' ? res.data : '';
    const $ = cheerio.load(html);

    // 1. Check meta tags (often contain the bio/description)
    const ogDesc = $('meta[property="og:description"]').attr('content') || '';
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    const combinedMeta = `${ogDesc} ${metaDesc}`;

    let emails = extractValidEmails(combinedMeta);
    let phones = extractPotentialPhones(combinedMeta);

    // 2. Search entire html if not found in meta
    if (emails.length === 0) {
      emails = extractValidEmails(html);
    }
    if (phones.length === 0) {
      phones = extractPotentialPhones(html);
    }

    return {
      email: emails[0] || null,
      phone: phones[0] || null,
    };
  } catch {
    return { email: null, phone: null };
  }
}

/**
 * Inspect Instagram page for bio information (phone / email)
 */
async function inspectInstagramPage(url: string, userCookie?: string): Promise<{ email: string | null; phone: string | null }> {
  try {
    const headers: Record<string, string> = { ...DEFAULT_HEADERS };
    if (userCookie && userCookie.trim()) {
      headers['Cookie'] = userCookie.trim();
    }

    const res = await axios.get(url, { headers, timeout: 8000, validateStatus: () => true });
    const html = typeof res.data === 'string' ? res.data : '';
    const $ = cheerio.load(html);

    // Instagram embeds user bio and contact info in meta description or title
    const ogDesc = $('meta[property="og:description"]').attr('content') || '';
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    const title = $('title').text() || '';
    const combined = `${title} ${ogDesc} ${metaDesc}`;

    const emails = extractValidEmails(combined);
    const phones = extractPotentialPhones(combined);

    return {
      email: emails[0] || null,
      phone: phones[0] || null,
    };
  } catch {
    return { email: null, phone: null };
  }
}

/**
 * Main enrichment function for social profiles
 */
export async function enrichLeadFromSocial(
  lead: {
    name: string;
    city?: string | null;
    phone?: string | null;
    email?: string | null;
    socialFacebook?: string | null;
    socialInstagram?: string | null;
  },
  userSocialConfig?: {
    socialFbCookie?: string;
    socialIgCookie?: string;
  }
): Promise<SocialEnrichmentResult> {
  const result: SocialEnrichmentResult = {
    email: lead.email || null,
    phone: lead.phone || null,
    cleanPhone: cleanPhoneNumber(lead.phone),
    socialFacebook: lead.socialFacebook || null,
    socialInstagram: lead.socialInstagram || null,
    foundSources: [],
  };

  const searchQuery = `${lead.name} ${lead.city || ''}`.trim();

  // 1. FACEBOOK ENRICHMENT
  let fbUrl = lead.socialFacebook;
  if (!fbUrl) {
    fbUrl = await searchSocialProfileUrl(searchQuery, 'facebook.com');
    if (fbUrl) {
      result.socialFacebook = fbUrl;
      result.foundSources.push('Facebook URL detectada');
    }
  }

  if (fbUrl && (!result.email || !result.phone)) {
    const fbData = await inspectFacebookPage(fbUrl, userSocialConfig?.socialFbCookie);
    if (fbData.email && !result.email) {
      result.email = fbData.email;
      result.foundSources.push('Email extraído de Facebook');
    }
    if (fbData.phone && !result.phone) {
      result.phone = fbData.phone;
      result.cleanPhone = cleanPhoneNumber(fbData.phone);
      result.foundSources.push('Teléfono extraído de Facebook');
    }
  }

  // 2. INSTAGRAM ENRICHMENT
  let igUrl = lead.socialInstagram;
  if (!igUrl) {
    igUrl = await searchSocialProfileUrl(searchQuery, 'instagram.com');
    if (igUrl) {
      result.socialInstagram = igUrl;
      result.foundSources.push('Instagram URL detectada');
    }
  }

  if (igUrl && (!result.email || !result.phone)) {
    const igData = await inspectInstagramPage(igUrl, userSocialConfig?.socialIgCookie);
    if (igData.email && !result.email) {
      result.email = igData.email;
      result.foundSources.push('Email extraído de Instagram');
    }
    if (igData.phone && !result.phone) {
      result.phone = igData.phone;
      result.cleanPhone = cleanPhoneNumber(igData.phone);
      result.foundSources.push('Teléfono extraído de Instagram');
    }
  }

  return result;
}
