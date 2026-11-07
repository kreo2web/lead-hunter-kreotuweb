import { chromium, Browser, Page } from 'playwright';
import { enrichWebsite } from './webEnricher.js';
import { enrichLeadFromSocial } from './socialEnricher.js';

export interface RawLead {
  name: string;
  phone: string | null;
  cleanPhone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  rating: number | null;
  reviewsCount: number | null;
  googleMapsUrl: string;
  placeId: string;
}

export interface ProgressCallback {
  (update: {
    status: string;
    step: 'SEARCHING' | 'EXTRACTING' | 'ENRICHING' | 'COMPLETED' | 'ERROR';
    current: number;
    total: number;
    lead?: any;
    error?: string;
  }): void;
}

export interface SearchOptions {
  city?: string;
  state?: string;
  country?: string;
  strictLocation?: boolean;
}

/**
 * Normalizes a text removing diacritics, punctuation and lowercasing for accurate geo-matching.
 */
export function normalizeGeoText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses a free-form location query into city, state, country if possible.
 * E.g. "Progreso, Yucatan, Mexico" -> { city: "Progreso", state: "Yucatan", country: "Mexico" }
 */
export function parseLocationString(loc: string | null | undefined): { city: string; state: string; country: string } {
  if (!loc) return { city: '', state: '', country: '' };
  const parts = loc.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 1) return { city: parts[0], state: '', country: '' };
  if (parts.length === 2) return { city: parts[0], state: '', country: parts[1] };
  return {
    city: parts[0],
    state: parts.slice(1, -1).join(', '),
    country: parts[parts.length - 1],
  };
}

/**
 * Verifies if a lead's address or city matches the target city / municipality.
 * Prevents Google Maps from returning businesses in nearby larger cities (e.g. returning Mérida when searching Progreso).
 */
export function doesLeadMatchTargetLocation(
  leadAddress: string | null | undefined,
  leadCity: string | null | undefined,
  targetCity: string | null | undefined
): boolean {
  if (!targetCity || !targetCity.trim()) return true;

  const normTarget = normalizeGeoText(targetCity);
  if (!normTarget || normTarget.length < 3) return true;

  const normAddress = normalizeGeoText(leadAddress);
  const normCity = normalizeGeoText(leadCity);
  const combined = `${normAddress} ${normCity}`;

  // Direct word or substring match
  if (combined.includes(normTarget)) {
    return true;
  }

  // Token match (e.g. "san miguel de allende" matching "san miguel")
  const targetTokens = normTarget.split(' ').filter((t) => t.length > 2);
  if (targetTokens.length > 0 && targetTokens.every((t) => combined.includes(t))) {
    return true;
  }

  return false;
}

export function cleanPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digitsOnly = phone.replace(/[^0-9]/g, '');
  if (digitsOnly.length < 7) return null;
  return digitsOnly;
}

/**
 * Normalizes a phone number for international WhatsApp comparison.
 * Handles country prefixes and country-specific mobile digits (e.g. Mexico 52 1 ..., Argentina 54 9 ...).
 */
export function normalizeWaPhone(raw: string | null | undefined): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);

  // Mexico mobile numbers in WhatsApp are often formatted as 521XXXXXXXXXX (13 digits),
  // whereas international contacts or local numbers might be 52XXXXXXXXXX (12 digits) or 10 digits.
  if (digits.startsWith('521') && digits.length === 13) {
    digits = '52' + digits.slice(3);
  }

  // Argentina mobile numbers in WhatsApp often have 549XXXXXXXXXX (12-13 digits)
  if (digits.startsWith('549') && digits.length >= 12) {
    digits = '54' + digits.slice(3);
  }

  return digits;
}

/**
 * Checks whether two phone numbers represent the same phone / contact across different international formats.
 */
export function doPhonesMatch(phoneA: string | null | undefined, phoneB: string | null | undefined): boolean {
  if (!phoneA || !phoneB) return false;
  const normA = normalizeWaPhone(phoneA);
  const normB = normalizeWaPhone(phoneB);
  if (!normA || !normB) return false;

  // Exact normalized match
  if (normA === normB) return true;

  // Suffix match for 10 digits (standard national mobile length for Mexico, Colombia, USA, Spain, etc.)
  if (normA.length >= 10 && normB.length >= 10) {
    if (normA.slice(-10) === normB.slice(-10)) return true;
  }

  // Suffix match for 8 or 9 digits (local number match)
  const minLen = Math.min(normA.length, normB.length);
  if (minLen >= 8) {
    const compareDigits = Math.min(minLen, 9);
    if (normA.slice(-compareDigits) === normB.slice(-compareDigits)) return true;
  }

  return false;
}

function stripMapIcons(text: string | null | undefined): string | null {
  if (!text) return null;
  // Remove Unicode Private Use Area characters commonly used as icons in Google Maps
  return text.replace(/[\uE000-\uF8FF]/g, '').trim();
}

export async function scrapeGoogleMaps(
  query: string,
  limit: number = 10,
  onProgress?: ProgressCallback,
  options?: SearchOptions
): Promise<any[]> {
  let browser: Browser | null = null;
  const results: any[] = [];

  // Parse location options if provided or infer from query string
  // e.g. query: "Restaurantes en Progreso, Yucatan, Mexico"
  let targetCity = options?.city?.trim() || '';
  let targetState = options?.state?.trim() || '';
  let targetCountry = options?.country?.trim() || '';

  if (!targetCity) {
    const enMatch = query.match(/(?: en | in )([^,]+)(?:,\s*([^,]+))?(?:,\s*([^,]+))?/i);
    if (enMatch) {
      targetCity = enMatch[1]?.trim() || '';
      targetState = enMatch[2]?.trim() || '';
      targetCountry = enMatch[3]?.trim() || '';
    }
  }

  const locationLabel = [targetCity, targetState, targetCountry].filter(Boolean).join(', ');

  try {
    onProgress?.({
      status: locationLabel
        ? `Centrando búsqueda en "${locationLabel}" para "${query}"...`
        : `Iniciando navegador para buscar "${query}"...`,
      step: 'SEARCHING',
      current: 0,
      total: limit,
    });

    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--lang=es-ES,es',
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      locale: 'es-ES',
    });

    const page: Page = await context.newPage();

    // STEP 1: Center Google Maps on target city/municipality if specified
    // Navigating directly to /maps/place/{location} anchors Google Maps viewport coordinates
    // preventing it from drifting to neighboring large capitals (e.g. Mérida when searching Progreso)
    if (locationLabel) {
      try {
        const placeAnchorUrl = `https://www.google.com/maps/place/${encodeURIComponent(locationLabel)}?hl=es`;
        await page.goto(placeAnchorUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        // Handle cookie consent once
        try {
          const consentBtn = page.locator(
            'button:has-text("Aceptar todo"), button:has-text("Aceptar"), button:has-text("Accept all"), form button[aria-label*="Aceptar"]'
          );
          if (await consentBtn.first().isVisible({ timeout: 3000 })) {
            await consentBtn.first().click();
            await page.waitForTimeout(500);
          }
        } catch {}
        await page.waitForTimeout(1500);
      } catch (anchorErr: any) {
        console.warn('Notice anchoring location view:', anchorErr.message);
      }
    }

    // STEP 2: Execute search query inside the anchored location view
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=es`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Handle Google cookie consent banner if present
    try {
      const consentBtn = page.locator(
        'button:has-text("Aceptar todo"), button:has-text("Aceptar"), button:has-text("Accept all"), form button[aria-label*="Aceptar"]'
      );
      if (await consentBtn.first().isVisible({ timeout: 3000 })) {
        await consentBtn.first().click();
        await page.waitForTimeout(800);
      }
    } catch {
      // Ignore consent if not present
    }

    // Wait for the feed or results list
    const feedSelector = 'div[role="feed"]';
    try {
      await page.waitForSelector(feedSelector, { timeout: 15000 });
    } catch {
      const singleHeading = await page.locator('h1.DUwDvf').first().textContent().catch(() => null);
      if (singleHeading) {
        const singleLead = await extractPlaceDetails(page, page.url());
        if (singleLead && doesLeadMatchTargetLocation(singleLead.address, singleLead.city, targetCity)) {
          const enriched = await enrichWebsite(singleLead.website);
          const fullLead = { ...singleLead, ...enriched };
          results.push(fullLead);
          onProgress?.({
            status: `Extraído 1 de 1 en ${targetCity || 'zona'}: ${fullLead.name}`,
            step: 'COMPLETED',
            current: 1,
            total: 1,
            lead: fullLead,
          });
        }
        await browser.close();
        return results;
      }
    }

    onProgress?.({
      status: `Explorando resultados de "${query}" en Google Maps...`,
      step: 'SEARCHING',
      current: 0,
      total: limit,
    });

    // Scroll the feed to accumulate elements
    let previousCount = 0;
    let scrollAttempts = 0;
    const maxScrolls = 25;

    // We accumulate slightly more candidate links to compensate for results that belong to neighbouring cities
    const targetCandidatePool = targetCity ? Math.min(limit * 3, 50) : limit;

    while (scrollAttempts < maxScrolls) {
      const placeLinks = await page.locator('div[role="feed"] a[href*="/maps/place/"]').all();
      if (placeLinks.length >= targetCandidatePool || (placeLinks.length === previousCount && scrollAttempts > 2)) {
        if (placeLinks.length >= targetCandidatePool) break;
      }

      previousCount = placeLinks.length;
      await page.evaluate((selector) => {
        const feed = document.querySelector(selector);
        if (feed) {
          feed.scrollTop = feed.scrollHeight;
        }
      }, feedSelector);

      await page.waitForTimeout(1200);
      scrollAttempts++;
    }

    const itemLinks = await page.locator('div[role="feed"] a[href*="/maps/place/"]').all();
    const candidateUrls: string[] = [];
    for (const link of itemLinks) {
      const href = await link.getAttribute('href');
      if (href && !candidateUrls.includes(href)) {
        candidateUrls.push(href);
        if (candidateUrls.length >= targetCandidatePool) break;
      }
    }

    onProgress?.({
      status: `Encontradas fichas preliminares. Extrayendo y verificando ubicación en "${targetCity || 'la zona'}"...`,
      step: 'EXTRACTING',
      current: 0,
      total: limit,
    });

    for (let i = 0; i < candidateUrls.length; i++) {
      if (results.length >= limit) break;

      const placeUrl = candidateUrls[i];
      try {
        await page.goto(placeUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(800);

        const placeData = await extractPlaceDetails(page, placeUrl);
        if (!placeData || !placeData.name) continue;

        // GEO VALIDATION: verify if lead belongs to the target city / municipality
        if (targetCity && !doesLeadMatchTargetLocation(placeData.address, placeData.city, targetCity)) {
          console.log(`⏩ Descartado por estar fuera de ${targetCity}: "${placeData.name}" (${placeData.address || placeData.city || 'Sin dirección'})`);
          continue;
        }

        onProgress?.({
          status: `Auditando presencia web: ${placeData.name} (${results.length + 1}/${limit})...`,
          step: 'ENRICHING',
          current: results.length + 1,
          total: limit,
        });

        // Enrich with email, social media and website audit
        const enriched = await enrichWebsite(placeData.website);

        // Build initial phones list from Maps and Website
        const initialPhones: any[] = [];
        if (placeData.phone && placeData.cleanPhone) {
          initialPhones.push({
            phone: placeData.phone,
            cleanPhone: placeData.cleanPhone,
            source: 'Google Maps',
            isDefault: true,
          });
        }
        if (enriched.websitePhones && Array.isArray(enriched.websitePhones)) {
          for (const wp of enriched.websitePhones) {
            if (!initialPhones.some(p => p.cleanPhone === wp.cleanPhone)) {
              initialPhones.push(wp);
            }
          }
        }

        let fullLead = {
          ...placeData,
          ...enriched,
          phone: placeData.phone || (initialPhones[0]?.phone || null),
          cleanPhone: placeData.cleanPhone || (initialPhones[0]?.cleanPhone || null),
          phoneSource: placeData.phone ? 'Google Maps' : (initialPhones[0]?.source || null),
          socialPhone: null as string | null,
          phonesJson: JSON.stringify(initialPhones),
        };

        // Always search across social networks (Facebook, Instagram) to find profiles & active phone numbers
        try {
          onProgress?.({
            status: `Buscando contacto en redes sociales para: ${placeData.name}...`,
            step: 'ENRICHING',
            current: results.length + 1,
            total: limit,
          });

          const socialResult = await enrichLeadFromSocial({
            name: fullLead.name,
            city: fullLead.city || targetCity,
            phone: fullLead.phone,
            cleanPhone: fullLead.cleanPhone,
            email: fullLead.email,
            socialFacebook: fullLead.socialFacebook,
            socialInstagram: fullLead.socialInstagram,
            phonesJson: fullLead.phonesJson,
          });

          if (socialResult.email) fullLead.email = socialResult.email;
          if (socialResult.socialPhone) fullLead.socialPhone = socialResult.socialPhone;
          if (socialResult.socialFacebook) fullLead.socialFacebook = socialResult.socialFacebook;
          if (socialResult.socialInstagram) fullLead.socialInstagram = socialResult.socialInstagram;

          if (socialResult.discoveredPhones && socialResult.discoveredPhones.length > 0) {
            fullLead.phonesJson = JSON.stringify(socialResult.discoveredPhones);
            if (!fullLead.phone) {
              fullLead.phone = socialResult.phone;
              fullLead.cleanPhone = socialResult.cleanPhone;
              fullLead.phoneSource = socialResult.phoneSource;
            }
          }
        } catch (socialErr: any) {
          console.warn(`Aviso: Error en enriquecimiento social de ${placeData.name}:`, socialErr.message);
        }

        results.push(fullLead);

        onProgress?.({
          status: `Prospecto guardado: ${fullLead.name} (${fullLead.city || targetCity}) [Ranking ${fullLead.rankingLevel}]`,
          step: 'EXTRACTING',
          current: results.length,
          total: limit,
          lead: fullLead,
        });
      } catch (err: any) {
        console.error(`Error extrayendo lugar ${i + 1}:`, err.message);
      }
    }

    onProgress?.({
      status: `¡Búsqueda finalizada! Se obtuvieron ${results.length} prospectos en ${targetCity || 'la zona solicitada'}.`,
      step: 'COMPLETED',
      current: results.length,
      total: results.length,
    });

    await browser.close();
    return results;
  } catch (error: any) {
    if (browser) await browser.close();
    onProgress?.({
      status: `Error en la extracción: ${error.message}`,
      step: 'ERROR',
      current: results.length,
      total: limit,
      error: error.message,
    });
    throw error;
  }
}

async function extractPlaceDetails(page: Page, url: string): Promise<RawLead | null> {
  try {
    // Business name
    const nameEl = page.locator('h1.DUwDvf').first();
    const rawName = (await nameEl.textContent().catch(() => null))?.trim() || '';
    const name = stripMapIcons(rawName) || '';
    if (!name) return null;

    // Category / Giro
    const catEl = page.locator('button.DkEaL').first();
    const category = stripMapIcons((await catEl.textContent().catch(() => null))?.trim());

    // Rating and Reviews
    let rating: number | null = null;
    let reviewsCount: number | null = null;

    const ratingEl = page.locator('span.ceNzKf').first();
    const ratingAria = await ratingEl.getAttribute('aria-label').catch(() => null);
    if (ratingAria) {
      const match = ratingAria.match(/([0-9]+[.,][0-9]+|[0-9]+)/);
      if (match) rating = parseFloat(match[1].replace(',', '.'));
    }

    const reviewsEl = page.locator('span[aria-label*="reseña"], span[aria-label*="review"]').first();
    const reviewsText = await reviewsEl.textContent().catch(() => null);
    if (reviewsText) {
      const match = reviewsText.replace(/[^0-9]/g, '');
      if (match) reviewsCount = parseInt(match, 10);
    }

    // Address
    let address: string | null = null;
    let city: string | null = null;
    const addressBtn = page.locator('button[data-item-id="address"], button[aria-label*="Dirección"]').first();
    const rawAddress = stripMapIcons((await addressBtn.textContent().catch(() => null))?.trim());
    if (rawAddress) {
      address = rawAddress;
      const parts = rawAddress.split(',').map((p) => p.trim());
      if (parts.length > 1) {
        city = parts[parts.length - 2] || parts[parts.length - 1];
      }
    }

    // Phone number
    let phone: string | null = null;
    const phoneBtn = page.locator('button[data-item-id*="phone"], button[aria-label*="Teléfono"]').first();
    const rawPhone = stripMapIcons((await phoneBtn.textContent().catch(() => null))?.trim());
    if (rawPhone) {
      phone = rawPhone;
    }
    const cleanPhone = cleanPhoneNumber(phone);

    // Website
    let website: string | null = null;
    const webBtn = page.locator('a[data-item-id="authority"], a[aria-label*="Sitio web"], a[aria-label*="website"]').first();
    const webHref = await webBtn.getAttribute('href').catch(() => null);
    if (webHref && !webHref.includes('google.com')) {
      website = webHref;
    }

    // Place ID extracted from URL
    const placeIdMatch = url.match(/!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/) || url.match(/place\/([^\/]+)/);
    const placeId = placeIdMatch ? placeIdMatch[1] : `place_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return {
      name,
      phone,
      cleanPhone,
      website,
      address,
      city,
      category,
      rating,
      reviewsCount,
      googleMapsUrl: url,
      placeId,
    };
  } catch (err: any) {
    console.error('Error parsing place card:', err.message);
    return null;
  }
}

/**
 * Fast density inspection for multiple categories in a given city.
 * Queries Google Maps in parallel/concurrency to count immediate places found.
 */
export async function probeCategoryDensity(
  city: string,
  categories: string[]
): Promise<Array<{ category: string; estimatedCount: number; densityLevel: 'ALTA' | 'MEDIA' | 'BAJA' }>> {
  let browser: Browser | null = null;
  const results: Array<{ category: string; estimatedCount: number; densityLevel: 'ALTA' | 'MEDIA' | 'BAJA' }> = [];

  const locParts = parseLocationString(city);
  const targetCity = locParts.city || city;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--lang=es-ES,es',
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1024, height: 768 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      locale: 'es-ES',
    });

    // Anchor first to specific city location to lock the map view in the browser session
    try {
      const anchorPage = await context.newPage();
      await anchorPage.goto(`https://www.google.com/maps/place/${encodeURIComponent(city)}?hl=es`, {
        waitUntil: 'domcontentloaded',
        timeout: 12000,
      });
      try {
        const consentBtn = anchorPage.locator(
          'button:has-text("Aceptar todo"), button:has-text("Aceptar"), button:has-text("Accept all"), form button[aria-label*="Aceptar"]'
        );
        if (await consentBtn.first().isVisible({ timeout: 2500 })) {
          await consentBtn.first().click();
        }
      } catch {}
      await anchorPage.waitForTimeout(1000);
      await anchorPage.close().catch(() => {});
    } catch {}

    for (const cat of categories) {
      const page = await context.newPage();
      try {
        const query = `${cat} en ${city}`;
        const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=es`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });

        // Quick check for places count in feed
        await page.waitForTimeout(1500);
        const placeLinks = await page.locator('div[role="feed"] a[href*="/maps/place/"]').all();
        let count = placeLinks.length;

        // If single place view opened directly
        const singleHeading = await page.locator('h1.DUwDvf').first().textContent().catch(() => null);
        if (count === 0 && singleHeading) {
          count = 1;
        }

        let densityLevel: 'ALTA' | 'MEDIA' | 'BAJA' = 'BAJA';
        if (count >= 7) {
          densityLevel = 'ALTA';
        } else if (count >= 3) {
          densityLevel = 'MEDIA';
        }

        results.push({
          category: cat,
          estimatedCount: count,
          densityLevel,
        });
      } catch {
        results.push({
          category: cat,
          estimatedCount: 0,
          densityLevel: 'BAJA',
        });
      } finally {
        await page.close().catch(() => {});
      }
    }
  } catch (err: any) {
    console.error('Error in probeCategoryDensity:', err.message);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  return results;
}
