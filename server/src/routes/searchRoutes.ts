import { Router, Request, Response } from 'express';
import { scrapeGoogleMaps } from '../scrapers/gmapsScraper.js';
import { run, query } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import { getUserFromReq } from './authRoutes.js';

const router = Router();

router.get('/stream', async (req: Request, res: Response) => {
  const searchQuery = (req.query.query as string) || '';
  const limit = parseInt((req.query.limit as string) || '10', 10);
  const session = getUserFromReq(req);
  const userId = session?.userId || (req.query.userId as string) || null;

  if (!searchQuery.trim()) {
    res.status(400).json({ error: 'El parámetro "query" es requerido.' });
    return;
  }

  // Setup Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const scraped = await scrapeGoogleMaps(searchQuery, limit, async (progress) => {
      sendEvent('progress', progress);

      // If a single lead was just extracted and enriched, save to database immediately with searchQuery & userId
      if (progress.lead) {
        await saveOrUpdateLead(progress.lead, searchQuery, userId);
      }
    });

    sendEvent('complete', { total: scraped.length });
    res.end();
  } catch (error: any) {
    sendEvent('error', { message: error.message || 'Error en el proceso de búsqueda' });
    res.end();
  }
});

async function saveOrUpdateLead(lead: any, searchQuery: string, userId: string | null = null) {
  const ownerId = userId || 'admin-001';
  const existing = await query(
    'SELECT id FROM leads WHERE userId = ? AND (placeId = ? OR (name = ? AND address = ?))',
    [ownerId, lead.placeId, lead.name, lead.address]
  );

  const id = existing.length > 0 ? existing[0].id : uuidv4();
  const now = new Date().toISOString();

  await run(
    `INSERT INTO leads (
      id, userId, name, phone, cleanPhone, website, address, city, category, searchQuery,
      rating, reviewsCount, googleMapsUrl, placeId, email,
      socialFacebook, socialInstagram, socialLinkedin, socialTiktok, socialTwitter,
      hasWebsite, isOutdatedWebsite, websiteAuditNotes, rankingScore, rankingLevel,
      status, notes, createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      COALESCE((SELECT status FROM leads WHERE id = ?), 'NUEVO'),
      COALESCE((SELECT notes FROM leads WHERE id = ?), ''),
      COALESCE((SELECT createdAt FROM leads WHERE id = ?), ?),
      ?
    )
    ON CONFLICT(userId, placeId) DO UPDATE SET
      userId = COALESCE(leads.userId, excluded.userId),
      name = excluded.name,
      phone = excluded.phone,
      cleanPhone = excluded.cleanPhone,
      website = excluded.website,
      address = excluded.address,
      city = excluded.city,
      category = excluded.category,
      searchQuery = excluded.searchQuery,
      rating = excluded.rating,
      reviewsCount = excluded.reviewsCount,
      googleMapsUrl = excluded.googleMapsUrl,
      email = excluded.email,
      socialFacebook = excluded.socialFacebook,
      socialInstagram = excluded.socialInstagram,
      socialLinkedin = excluded.socialLinkedin,
      socialTiktok = excluded.socialTiktok,
      socialTwitter = excluded.socialTwitter,
      hasWebsite = excluded.hasWebsite,
      isOutdatedWebsite = excluded.isOutdatedWebsite,
      websiteAuditNotes = excluded.websiteAuditNotes,
      rankingScore = excluded.rankingScore,
      rankingLevel = excluded.rankingLevel,
      updatedAt = excluded.updatedAt
    `,
    [
      id,
      userId,
      lead.name,
      lead.phone,
      lead.cleanPhone,
      lead.website,
      lead.address,
      lead.city,
      lead.category,
      searchQuery,
      lead.rating,
      lead.reviewsCount,
      lead.googleMapsUrl,
      lead.placeId,
      lead.email,
      lead.socialFacebook,
      lead.socialInstagram,
      lead.socialLinkedin,
      lead.socialTiktok,
      lead.socialTwitter,
      lead.hasWebsite ? 1 : 0,
      lead.isOutdatedWebsite ? 1 : 0,
      lead.websiteAuditNotes,
      lead.rankingScore,
      lead.rankingLevel,
      id,
      id,
      id,
      now,
      now,
    ]
  );
}

export default router;
