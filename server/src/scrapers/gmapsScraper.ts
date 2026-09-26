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

export function cleanPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digitsOnly = phone.replace(/[^0-9]/g, '');
  if (digitsOnly.length < 7) return null;
  return digitsOnly;
}

function stripMapIcons(text: string | null | undefined): string | null {
  if (!text) return null;
  // Remove Unicode Private Use Area characters commonly used as icons in Google Maps
  return text.replace(/[\uE000-\uF8FF]/g, '').trim();
}

export async function scrapeGoogleMaps(
  query: string,
  limit: number = 10,
  onProgress?: ProgressCallback
): Promise<any[]> {
  let browser: Browser | null = null;
  const results: any[] = [];

  try {
    onProgress?.({
      status: `Iniciando navegador para buscar "${query}"...`,
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
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=es`;

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Handle Google cookie consent banner if present
    try {
      const consentBtn = page.locator(
        'button:has-text("Aceptar todo"), button:has-text("Aceptar"), button:has-text("Accept all"), form button[aria-label*="Aceptar"]'
      );
      if (await consentBtn.first().isVisible({ timeout: 4000 })) {
        await consentBtn.first().click();
        await page.waitForTimeout(1000);
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
        if (singleLead) {
          const enriched = await enrichWebsite(singleLead.website);
          const fullLead = { ...singleLead, ...enriched };
          results.push(fullLead);
          onProgress?.({
            status: `Extraído 1 de 1: ${fullLead.name}`,
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

    while (scrollAttempts < maxScrolls) {
      const placeLinks = await page.locator('div[role="feed"] a[href*="/maps/place/"]').all();
      if (placeLinks.length >= limit || (placeLinks.length === previousCount && scrollAttempts > 2)) {
        if (placeLinks.length >= limit) break;
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
        if (candidateUrls.length >= limit) break;
      }
    }

    onProgress?.({
      status: `Encontrados ${candidateUrls.length} prospectos. Extrayendo información y auditando sitios web...`,
      step: 'EXTRACTING',
      current: 0,
      total: candidateUrls.length,
    });

    const targetCount = candidateUrls.length;

    for (let i = 0; i < candidateUrls.length; i++) {
      const placeUrl = candidateUrls[i];
      try {
        await page.goto(placeUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(1000);

        const placeData = await extractPlaceDetails(page, placeUrl);
        if (!placeData || !placeData.name) continue;

        onProgress?.({
          status: `Auditando presencia web para: ${placeData.name} (${i + 1}/${targetCount})...`,
          step: 'ENRICHING',
          current: i + 1,
          total: targetCount,
        });

        // Enrich with email, social media and website audit
        const enriched = await enrichWebsite(placeData.website);
        let fullLead = {
          ...placeData,
          ...enriched,
        };

        // If email or phone is missing, try searching across social networks (Facebook, Instagram)
        if (!fullLead.email || !fullLead.phone) {
          try {
            onProgress?.({
              status: `Buscando contacto en redes sociales para: ${placeData.name}...`,
              step: 'ENRICHING',
              current: i + 1,
              total: targetCount,
            });

            const socialResult = await enrichLeadFromSocial({
              name: fullLead.name,
              city: fullLead.city,
              phone: fullLead.phone,
              email: fullLead.email,
              socialFacebook: fullLead.socialFacebook,
              socialInstagram: fullLead.socialInstagram,
            });

            if (socialResult.email) fullLead.email = socialResult.email;
            if (socialResult.phone) {
              fullLead.phone = socialResult.phone;
              fullLead.cleanPhone = socialResult.cleanPhone;
            }
            if (socialResult.socialFacebook) fullLead.socialFacebook = socialResult.socialFacebook;
            if (socialResult.socialInstagram) fullLead.socialInstagram = socialResult.socialInstagram;
          } catch (socialErr: any) {
            console.warn(`Aviso: Error en enriquecimiento social de ${placeData.name}:`, socialErr.message);
          }
        }

        results.push(fullLead);

        onProgress?.({
          status: `Prospecto guardado: ${fullLead.name} [Ranking ${fullLead.rankingLevel}]`,
          step: 'EXTRACTING',
          current: i + 1,
          total: targetCount,
          lead: fullLead,
        });
      } catch (err: any) {
        console.error(`Error extrayendo lugar ${i + 1}:`, err.message);
      }
    }

    onProgress?.({
      status: `¡Búsqueda finalizada! Se obtuvieron ${results.length} prospectos.`,
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
