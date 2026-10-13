import axios from 'axios';
import * as cheerio from 'cheerio';
import { cleanPhoneNumber } from './gmapsScraper.js';

export interface DiscoveredPhone {
  phone: string;
  cleanPhone: string;
  source: string;
  isDefault?: boolean;
}

export interface SocialEnrichmentResult {
  email: string | null;
  phone: string | null;
  cleanPhone: string | null;
  phoneSource: string | null;
  socialPhone: string | null;
  discoveredPhones: DiscoveredPhone[];
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

export function extractValidEmails(text: string): string[] {
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

// ─── COMPREHENSIVE PHONE EXTRACTION UTILITIES ──────────────────────────────────

// WhatsApp direct links (wa.me/346XXXXXXXX or api.whatsapp.com/send?phone=...)
const WA_LINK_REGEX = /(?:wa\.me\/(?:\+|%2B)?|api\.whatsapp\.com\/send\?(?:[^"'\s]*&)?phone=(?:\+|%2B)?|whatsapp\.com\/send\?phone=(?:\+|%2B)?)(\d{8,15})/gi;

// Labeled phone numbers (e.g. "Teléfono: 612 34 56 78", "WhatsApp: +34 654...", "Llámanos: 91...")
const LABELED_PHONE_REGEX = /(?:tel[eé]fono|tel[eé]f|tel|m[oó]vil|celular|cel|whatsapp|wapp|wa|contacto|reservas|ll[aá]manos|llamar|call|phone|cita)[\s:.-]{1,8}([+]?[\d\s().-]{8,22})/gi;

// Generalized phone number pattern
const GENERAL_PHONE_REGEX = /(?:\+?(\d{1,3})[\s.-]?)?\(?(\d{2,4})\)?[\s.-]?(\d{2,4})[\s.-]?(\d{2,5})/g;

export function extractWhatsappLinks(text: string): string[] {
  if (!text) return [];
  const results: string[] = [];
  const matches = text.matchAll(WA_LINK_REGEX);
  for (const m of matches) {
    const digits = m[1];
    const cleaned = cleanPhoneNumber(digits);
    if (cleaned && cleaned.length >= 8 && cleaned.length <= 15) {
      const formatted = `+${cleaned}`;
      if (!results.includes(formatted)) {
        results.push(formatted);
      }
    }
  }
  return results;
}

export function extractPotentialPhones(text: string): string[] {
  if (!text) return [];
  const results: string[] = [];

  // 1. Direct WhatsApp links (highest confidence)
  const waPhones = extractWhatsappLinks(text);
  for (const p of waPhones) {
    if (!results.includes(p)) results.push(p);
  }

  // 2. Labeled phones
  const labeledMatches = text.matchAll(LABELED_PHONE_REGEX);
  for (const m of labeledMatches) {
    const rawNumber = m[1]?.trim();
    if (rawNumber) {
      const cleaned = cleanPhoneNumber(rawNumber);
      if (cleaned && cleaned.length >= 8 && cleaned.length <= 15) {
        // Discard obvious year false positives (e.g. 20242025)
        if (cleaned.startsWith('2024') || cleaned.startsWith('2025') || cleaned.startsWith('2026')) {
          continue;
        }
        if (!results.includes(rawNumber)) {
          results.push(rawNumber);
        }
      }
    }
  }

  // 3. General phone patterns
  const generalMatches = text.match(GENERAL_PHONE_REGEX) || [];
  for (const m of generalMatches) {
    const cleaned = cleanPhoneNumber(m);
    if (cleaned && cleaned.length >= 8 && cleaned.length <= 15) {
      if (cleaned.startsWith('2024') || cleaned.startsWith('2025') || cleaned.startsWith('2026')) {
        continue;
      }
      const trimmed = m.trim();
      if (!results.some(r => cleanPhoneNumber(r) === cleaned)) {
        results.push(trimmed);
      }
    }
  }

  return results;
}

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
};

/**
 * Searches DuckDuckGo HTML for social profile URLs and snippets
 */
async function searchSocialProfile(
  query: string,
  platform: 'facebook.com' | 'instagram.com'
): Promise<{ profileUrl: string | null; snippetText: string }> {
  try {
    const fullQuery = `${query} site:${platform}`;
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(fullQuery)}`;

    const res = await axios.get(searchUrl, {
      headers: DEFAULT_HEADERS,
      timeout: 8000,
    });

    const $ = cheerio.load(res.data);
    let matchedUrl: string | null = null;
    let combinedSnippets = '';

    $('div.result').each((_, el) => {
      const urlEl = $(el).find('a.result__url, a.result__snippet');
      const snippetEl = $(el).find('.result__snippet');
      const titleEl = $(el).find('.result__title');

      const snippet = `${titleEl.text()} ${snippetEl.text()}`.trim();
      if (snippet) {
        combinedSnippets += ` ${snippet}`;
      }

      if (!matchedUrl) {
        const href = urlEl.attr('href') || $(el).find('a').attr('href') || '';
        let actualUrl = href;
        if (href.includes('uddg=')) {
          try {
            const parsed = new URL('https:' + href);
            const target = parsed.searchParams.get('uddg');
            if (target) actualUrl = decodeURIComponent(target);
          } catch {}
        }

        if (
          actualUrl.includes(platform) &&
          !actualUrl.includes('/sharer') &&
          !actualUrl.includes('/share') &&
          !actualUrl.includes('/directory') &&
          !actualUrl.includes('/hashtag') &&
          !actualUrl.includes('/explore')
        ) {
          matchedUrl = actualUrl;
        }
      }
    });

    return { profileUrl: matchedUrl, snippetText: combinedSnippets };
  } catch (err: any) {
    return { profileUrl: null, snippetText: '' };
  }
}

/**
 * Inspect Facebook page for email and phone contact info
 */
async function inspectFacebookPage(
  url: string,
  userCookie?: string
): Promise<{ email: string | null; phones: string[]; sourceUrl: string }> {
  try {
    const headers: Record<string, string> = { ...DEFAULT_HEADERS };
    if (userCookie && userCookie.trim()) {
      headers['Cookie'] = userCookie.trim();
    }

    const res = await axios.get(url, { headers, timeout: 9000, validateStatus: () => true });
    if (res.status >= 400) return { email: null, phones: [], sourceUrl: url };

    const html = typeof res.data === 'string' ? res.data : '';
    const $ = cheerio.load(html);

    const ogDesc = $('meta[property="og:description"]').attr('content') || '';
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    const title = $('title').text() || '';
    const combinedMeta = `${title} ${ogDesc} ${metaDesc}`;

    let emails = extractValidEmails(combinedMeta);
    let phones: string[] = [];

    // Check ld+json schema telephone
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const jsonText = $(el).html();
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          const tel = parsed.telephone || parsed.contactPoint?.telephone;
          if (tel && typeof tel === 'string') {
            phones.push(tel.trim());
          }
          if (parsed.email && typeof parsed.email === 'string') {
            emails.push(parsed.email.trim());
          }
        }
      } catch {}
    });

    // Check WhatsApp links in HTML
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes('wa.me') || href.includes('whatsapp.com')) {
        const waFound = extractWhatsappLinks(href);
        phones.push(...waFound);
      }
      if (href.startsWith('tel:')) {
        const telNumber = href.replace(/^tel:/i, '').split('?')[0].trim();
        if (telNumber) phones.push(telNumber);
      }
    });

    // Check meta & body text
    phones.push(...extractPotentialPhones(combinedMeta));
    if (phones.length === 0) {
      phones.push(...extractPotentialPhones(html));
    }
    if (emails.length === 0) {
      emails = extractValidEmails(html);
    }

    // Deduplicate
    const uniquePhones: string[] = [];
    for (const p of phones) {
      const cleaned = cleanPhoneNumber(p);
      if (cleaned && !uniquePhones.some(up => cleanPhoneNumber(up) === cleaned)) {
        uniquePhones.push(p);
      }
    }

    return {
      email: emails[0] || null,
      phones: uniquePhones,
      sourceUrl: url,
    };
  } catch {
    return { email: null, phones: [], sourceUrl: url };
  }
}

/**
 * Inspect Instagram page for bio information (phone / email)
 */
async function inspectInstagramPage(
  url: string,
  userCookie?: string
): Promise<{ email: string | null; phones: string[]; sourceUrl: string }> {
  try {
    const headers: Record<string, string> = { ...DEFAULT_HEADERS };
    if (userCookie && userCookie.trim()) {
      headers['Cookie'] = userCookie.trim();
    }

    const res = await axios.get(url, { headers, timeout: 9000, validateStatus: () => true });
    const html = typeof res.data === 'string' ? res.data : '';
    const $ = cheerio.load(html);

    const ogDesc = $('meta[property="og:description"]').attr('content') || '';
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    const title = $('title').text() || '';
    const combined = `${title} ${ogDesc} ${metaDesc}`;

    let emails = extractValidEmails(combined);
    let phones: string[] = [];

    // WhatsApp links or tel links
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes('wa.me') || href.includes('whatsapp.com')) {
        phones.push(...extractWhatsappLinks(href));
      }
      if (href.startsWith('tel:')) {
        const telNumber = href.replace(/^tel:/i, '').split('?')[0].trim();
        if (telNumber) phones.push(telNumber);
      }
    });

    phones.push(...extractPotentialPhones(combined));

    const uniquePhones: string[] = [];
    for (const p of phones) {
      const cleaned = cleanPhoneNumber(p);
      if (cleaned && !uniquePhones.some(up => cleanPhoneNumber(up) === cleaned)) {
        uniquePhones.push(p);
      }
    }

    return {
      email: emails[0] || null,
      phones: uniquePhones,
      sourceUrl: url,
    };
  } catch {
    return { email: null, phones: [], sourceUrl: url };
  }
}

/**
 * Main enrichment function for social profiles with multi-number support
 */
export async function enrichLeadFromSocial(
  lead: {
    name: string;
    city?: string | null;
    phone?: string | null;
    cleanPhone?: string | null;
    email?: string | null;
    socialFacebook?: string | null;
    socialInstagram?: string | null;
    phonesJson?: string | null;
  },
  userSocialConfig?: {
    socialFbCookie?: string;
    socialIgCookie?: string;
  }
): Promise<SocialEnrichmentResult> {
  const discoveredPhones: DiscoveredPhone[] = [];

  // Parse existing phones if any
  if (lead.phonesJson) {
    try {
      const parsed = JSON.parse(lead.phonesJson);
      if (Array.isArray(parsed)) {
        for (const p of parsed) {
          if (p.phone && p.cleanPhone) {
            discoveredPhones.push(p);
          }
        }
      }
    } catch {}
  }

  // Ensure current lead phone is registered
  if (lead.phone) {
    const cl = cleanPhoneNumber(lead.phone) || lead.cleanPhone;
    if (cl && !discoveredPhones.some(p => p.cleanPhone === cl)) {
      discoveredPhones.push({
        phone: lead.phone,
        cleanPhone: cl,
        source: 'Google Maps',
        isDefault: true,
      });
    }
  }

  const result: SocialEnrichmentResult = {
    email: lead.email || null,
    phone: lead.phone || null,
    cleanPhone: cleanPhoneNumber(lead.phone) || lead.cleanPhone || null,
    phoneSource: lead.phone ? 'Google Maps' : null,
    socialPhone: null,
    discoveredPhones,
    socialFacebook: lead.socialFacebook || null,
    socialInstagram: lead.socialInstagram || null,
    foundSources: [],
  };

  const searchQuery = `${lead.name} ${lead.city || ''}`.trim();

  // ─── 1. FACEBOOK ENRICHMENT ──────────────────────────────────────────────────
  let fbUrl = lead.socialFacebook;
  let fbSnippetText = '';

  if (!fbUrl) {
    const searchRes = await searchSocialProfile(searchQuery, 'facebook.com');
    if (searchRes.profileUrl) {
      fbUrl = searchRes.profileUrl;
      result.socialFacebook = fbUrl;
      result.foundSources.push('Facebook detectado');
    }
    fbSnippetText = searchRes.snippetText;
  }

  // Extract from Facebook search snippet
  if (fbSnippetText) {
    const snippetEmails = extractValidEmails(fbSnippetText);
    if (snippetEmails.length > 0 && !result.email) {
      result.email = snippetEmails[0];
      result.foundSources.push('Email hallado en perfil de Facebook');
    }
    const snippetPhones = extractPotentialPhones(fbSnippetText);
    for (const sp of snippetPhones) {
      const cl = cleanPhoneNumber(sp);
      if (cl && !result.discoveredPhones.some(dp => dp.cleanPhone === cl)) {
        result.discoveredPhones.push({
          phone: sp,
          cleanPhone: cl,
          source: 'Facebook (Perfil)',
          isDefault: !result.phone,
        });
        result.socialPhone = sp;
        result.foundSources.push(`Teléfono hallado en Facebook (${sp})`);
      }
    }
  }

  // Inspect Facebook profile page
  if (fbUrl) {
    const fbData = await inspectFacebookPage(fbUrl, userSocialConfig?.socialFbCookie);
    if (fbData.email && !result.email) {
      result.email = fbData.email;
      result.foundSources.push('Email extraído de página de Facebook');
    }
    for (const fp of fbData.phones) {
      const cl = cleanPhoneNumber(fp);
      if (cl && !result.discoveredPhones.some(dp => dp.cleanPhone === cl)) {
        result.discoveredPhones.push({
          phone: fp,
          cleanPhone: cl,
          source: fp.startsWith('+') && fp.includes('wa.me') ? 'Facebook (WhatsApp)' : 'Facebook',
          isDefault: !result.phone,
        });
        result.socialPhone = fp;
        result.foundSources.push(`Teléfono extraído de Facebook (${fp})`);
      }
    }
  }

  // ─── 2. INSTAGRAM ENRICHMENT ─────────────────────────────────────────────────
  let igUrl = lead.socialInstagram;
  let igSnippetText = '';

  if (!igUrl) {
    const searchRes = await searchSocialProfile(searchQuery, 'instagram.com');
    if (searchRes.profileUrl) {
      igUrl = searchRes.profileUrl;
      result.socialInstagram = igUrl;
      result.foundSources.push('Instagram detectado');
    }
    igSnippetText = searchRes.snippetText;
  }

  // Extract from Instagram search snippet
  if (igSnippetText) {
    const snippetEmails = extractValidEmails(igSnippetText);
    if (snippetEmails.length > 0 && !result.email) {
      result.email = snippetEmails[0];
      result.foundSources.push('Email hallado en bio de Instagram');
    }
    const snippetPhones = extractPotentialPhones(igSnippetText);
    for (const sp of snippetPhones) {
      const cl = cleanPhoneNumber(sp);
      if (cl && !result.discoveredPhones.some(dp => dp.cleanPhone === cl)) {
        result.discoveredPhones.push({
          phone: sp,
          cleanPhone: cl,
          source: 'Instagram (Bio)',
          isDefault: !result.phone,
        });
        result.socialPhone = sp;
        result.foundSources.push(`Teléfono hallado en Instagram (${sp})`);
      }
    }
  }

  // Inspect Instagram profile page
  if (igUrl) {
    const igData = await inspectInstagramPage(igUrl, userSocialConfig?.socialIgCookie);
    if (igData.email && !result.email) {
      result.email = igData.email;
      result.foundSources.push('Email extraído de Instagram');
    }
    for (const ip of igData.phones) {
      const cl = cleanPhoneNumber(ip);
      if (cl && !result.discoveredPhones.some(dp => dp.cleanPhone === cl)) {
        result.discoveredPhones.push({
          phone: ip,
          cleanPhone: cl,
          source: 'Instagram',
          isDefault: !result.phone,
        });
        result.socialPhone = ip;
        result.foundSources.push(`Teléfono extraído de Instagram (${ip})`);
      }
    }
  }

  // If lead had no primary phone, select the first discovered phone
  if (!result.phone && result.discoveredPhones.length > 0) {
    result.phone = result.discoveredPhones[0].phone;
    result.cleanPhone = result.discoveredPhones[0].cleanPhone;
    result.phoneSource = result.discoveredPhones[0].source;
    result.discoveredPhones[0].isDefault = true;
  }

  return result;
}
