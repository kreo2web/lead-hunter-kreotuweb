import axios from 'axios';
import * as cheerio from 'cheerio';
import { calculateRanking, checkIsSocialUrl, AuditResult } from '../services/rankingService.js';

export interface EnrichedWebData extends AuditResult {
  email: string | null;
  socialFacebook: string | null;
  socialInstagram: string | null;
  socialLinkedin: string | null;
  socialTiktok: string | null;
  socialTwitter: string | null;
}

const COMMON_EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

const IGNORED_EMAIL_DOMAINS = [
  'sentry.io', 'wixpress.com', 'example.com', 'domain.com',
  'wordpress.org', 'cloudflare.com', 'googleapis.com', 'schema.org'
];

function cleanEmail(rawEmail: string): string | null {
  const email = rawEmail.toLowerCase().trim();
  if (email.endsWith('.png') || email.endsWith('.jpg') || email.endsWith('.svg') || email.endsWith('.webp')) {
    return null;
  }
  const domain = email.split('@')[1];
  if (!domain || IGNORED_EMAIL_DOMAINS.some(d => domain.includes(d))) {
    return null;
  }
  return email;
}

function extractSocialUrl(links: string[], platform: string): string | null {
  const match = links.find(url => {
    try {
      const lower = url.toLowerCase();
      if (!lower.includes(platform)) return false;
      if (lower.includes('sharer') || lower.includes('share') || lower.includes('intent')) return false;
      return true;
    } catch {
      return false;
    }
  });
  return match || null;
}

export async function enrichWebsite(url: string | null | undefined): Promise<EnrichedWebData> {
  if (!url || url.trim() === '') {
    const ranking = calculateRanking(false);
    return {
      ...ranking,
      email: null,
      socialFacebook: null,
      socialInstagram: null,
      socialLinkedin: null,
      socialTiktok: null,
      socialTwitter: null,
    };
  }

  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  // Check if this website is actually a social media profile
  const socialCheck = checkIsSocialUrl(normalizedUrl);
  if (socialCheck.isSocial) {
    const ranking = calculateRanking(false, {
      isSocialAsWebsite: true,
      socialPlatformName: socialCheck.platform,
    });

    return {
      ...ranking,
      email: null,
      socialFacebook: normalizedUrl.toLowerCase().includes('facebook.com') || normalizedUrl.toLowerCase().includes('fb.com') ? normalizedUrl : null,
      socialInstagram: normalizedUrl.toLowerCase().includes('instagram.com') ? normalizedUrl : null,
      socialLinkedin: normalizedUrl.toLowerCase().includes('linkedin.com') ? normalizedUrl : null,
      socialTiktok: normalizedUrl.toLowerCase().includes('tiktok.com') ? normalizedUrl : null,
      socialTwitter: normalizedUrl.toLowerCase().includes('twitter.com') || normalizedUrl.toLowerCase().includes('x.com') ? normalizedUrl : null,
    };
  }

  const hasSsl = normalizedUrl.startsWith('https://');
  let isResponsive = true;
  let copyrightYear: number | null = null;
  const detectedIssues: string[] = [];
  const foundEmails = new Set<string>();
  const collectedLinks: string[] = [];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  };

  try {
    const response = await axios.get(normalizedUrl, {
      timeout: 8000,
      headers,
      maxRedirects: 5,
      validateStatus: () => true,
    });

    if (response.status >= 400) {
      detectedIssues.push(`Error HTTP ${response.status} al acceder al sitio`);
    }

    const html = typeof response.data === 'string' ? response.data : '';
    const $ = cheerio.load(html);

    // Check responsive viewport
    const viewport = $('meta[name="viewport"]').attr('content');
    if (!viewport || !viewport.includes('width=')) {
      isResponsive = false;
    }

    // Check copyright year
    const copyrightMatches = html.match(/(?:©|&copy;|copyright|derechos reservados)[^0-9]{0,25}(?:[12]\d{3}\s*[-–]\s*)?([12]\d{3})/i);
    if (copyrightMatches && copyrightMatches[1]) {
      const year = parseInt(copyrightMatches[1], 10);
      if (year >= 1998 && year <= new Date().getFullYear() + 1) {
        copyrightYear = year;
      }
    }

    // Extract mailto links
    $('a[href^="mailto:"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const email = href.replace(/^mailto:/i, '').split('?')[0];
      const cleaned = cleanEmail(email);
      if (cleaned) foundEmails.add(cleaned);
    });

    // Extract emails from body text
    const textMatches = html.match(COMMON_EMAIL_REGEX) || [];
    for (const match of textMatches) {
      const cleaned = cleanEmail(match);
      if (cleaned) foundEmails.add(cleaned);
    }

    // Collect all links for social networks
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        collectedLinks.push(href);
      }
    });

    // If no email found on homepage, try to inspect contact page link
    if (foundEmails.size === 0) {
      let contactHref: string | null = null;
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().toLowerCase();
        if (text.includes('contacto') || text.includes('contact') || href.includes('contacto') || href.includes('contact')) {
          try {
            contactHref = new URL(href, normalizedUrl).href;
          } catch {}
        }
      });

      if (contactHref && contactHref !== normalizedUrl) {
        try {
          const contactRes = await axios.get(contactHref, { timeout: 5000, headers });
          const contactHtml = typeof contactRes.data === 'string' ? contactRes.data : '';
          const contact$ = cheerio.load(contactHtml);

          contact$('a[href^="mailto:"]').each((_, el) => {
            const href = contact$(el).attr('href') || '';
            const email = href.replace(/^mailto:/i, '').split('?')[0];
            const cleaned = cleanEmail(email);
            if (cleaned) foundEmails.add(cleaned);
          });

          const cMatches = contactHtml.match(COMMON_EMAIL_REGEX) || [];
          for (const m of cMatches) {
            const cleaned = cleanEmail(m);
            if (cleaned) foundEmails.add(cleaned);
          }
        } catch {
          // Non-fatal
        }
      }
    }

  } catch (err: any) {
    detectedIssues.push(`Sitio inaccesible o caído (${err.message || 'error de conexión'})`);
  }

  const ranking = calculateRanking(true, {
    hasSsl,
    isResponsive,
    copyrightYear,
    isSlowOrFailing: detectedIssues.length > 0,
    detectedIssues,
  });

  const emailList = Array.from(foundEmails);

  return {
    ...ranking,
    email: emailList[0] || null,
    socialFacebook: extractSocialUrl(collectedLinks, 'facebook.com'),
    socialInstagram: extractSocialUrl(collectedLinks, 'instagram.com'),
    socialLinkedin: extractSocialUrl(collectedLinks, 'linkedin.com'),
    socialTiktok: extractSocialUrl(collectedLinks, 'tiktok.com'),
    socialTwitter: extractSocialUrl(collectedLinks, 'twitter.com') || extractSocialUrl(collectedLinks, 'x.com'),
  };
}
