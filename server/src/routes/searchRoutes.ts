import { Router, Request, Response } from 'express';
import { scrapeGoogleMaps, probeCategoryDensity } from '../scrapers/gmapsScraper.js';
import { run, query, get } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import { getUserFromReq } from './authRoutes.js';
import { generateAiReply } from '../services/aiAgentService.js';

const router = Router();

const DEFAULT_CANDIDATE_NICHES = [
  'Clínicas Dentales',
  'Restaurantes',
  'Talleres Mecánicos',
  'Inmobiliarias',
  'Ferreterías',
  'Salones de Belleza',
  'Gimnasios',
  'Clínicas Veterinarias',
  'Despachos Contables',
  'Abogados',
  'Tiendas de Ropa',
  'Cafeterías',
];

/**
 * POST /api/search/recommend-categories
 * Probes Google Maps for density and then enriches suggestions with the user's AI Agent.
 */
router.post('/recommend-categories', async (req: Request, res: Response) => {
  try {
    const { city, country } = req.body;
    if (!city || typeof city !== 'string' || !city.trim()) {
      res.status(400).json({ error: 'La ciudad es requerida.' });
      return;
    }

    const session = getUserFromReq(req);
    const userId = session?.userId || null;
    let user: any = null;
    if (userId) {
      user = await get<any>('SELECT * FROM users WHERE id = ?', [userId]);
    }

    const cleanCity = city.trim();
    const cleanCountry = (country || '').trim();
    const locationString = cleanCountry ? `${cleanCity}, ${cleanCountry}` : cleanCity;

    // Step 1: Probe density on Google Maps for candidate niches (quick scan)
    const probeCandidates = DEFAULT_CANDIDATE_NICHES.slice(0, 8); // Top 8 fast probes
    const densityData = await probeCategoryDensity(locationString, probeCandidates);

    // Step 2: Use configured AI (Gemini, Groq, etc.) to analyze findings and rank them
    let aiPrompt = `Analiza la ciudad o municipio "${locationString}" y estos resultados preliminares de presencia comercial en Google Maps:\n\n`;
    densityData.forEach((d) => {
      aiPrompt += `- ${d.category}: Densidad detectada: ${d.densityLevel} (Muestra inicial: ~${d.estimatedCount} lugares).\n`;
    });
    aiPrompt += `\nGenera un JSON con una lista recomendada de 6 a 8 rubros ideales para prospección comercial B2B (venta de sitios web, marketing y presencia digital) estrictamente centrados en ${locationString}.`;
    aiPrompt += `\nIMPORTANTE: No sustituyas ni cambies ${locationString} por otra ciudad grande o capital cercana. Todo debe ser para ${locationString}.`;
    aiPrompt += `\nPara cada rubro incluye:
- "category": nombre del rubro en español (ej. "Clínicas Dentales")
- "reason": breve justificación comercial de por qué conviene venderles servicios web en esa localidad (máximo 15 palabras)
- "opportunityLevel": "ALTA", "MEDIA" o "BAJA"
- "suggestedSearch": texto exacto sugerido para buscar en Google Maps (debe ser obligatoriamente: "[Rubro] en ${locationString}")
- "estimatedDensity": "ALTA", "MEDIA" o "BAJA"

Devuelve ÚNICAMENTE un array JSON válido sin texto adicional ni bloques markdown. Ejemplo: [{"category": "...", "reason": "...", "opportunityLevel": "ALTA", "suggestedSearch": "...", "estimatedDensity": "ALTA"}]`;

    let recommendations: any[] = [];
    try {
      const provider = user?.waBotProvider || 'gemini';
      const apiKey = user?.aiApiKey || (provider === 'openai' ? user?.openaiApiKey : user?.geminiApiKey) || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

      if (apiKey) {
        const rawAiReply = await generateAiReply([], aiPrompt, {
          provider,
          apiKey,
          modelName: user?.aiModelName,
          baseUrl: user?.aiBaseUrl,
          botName: 'Consultor de Prospección',
          companyName: user?.companyName || 'Lead Hunter',
          companyWebsite: user?.companyWebsite || '',
          instructions: 'Eres un analista de prospección B2B y prospección local para agencias de diseño web y marketing.',
          faqs: [],
        });

        const jsonMatch = rawAiReply.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          recommendations = JSON.parse(jsonMatch[0]);
        }
      }
    } catch (aiErr: any) {
      console.warn('Error enriqueciendo con IA, utilizando análisis heurístico:', aiErr.message);
    }

    // Fallback: If AI is not configured or failed, formulate recommendations directly from densityData
    if (!recommendations || recommendations.length === 0) {
      recommendations = densityData.map((d) => ({
        category: d.category,
        reason: d.densityLevel === 'ALTA' 
          ? 'Alta concentración de negocios locales con fuerte necesidad de digitalización.' 
          : 'Nicho comercial con menor saturación y excelente oportunidad de cierre.',
        opportunityLevel: d.densityLevel === 'ALTA' ? 'ALTA' : 'MEDIA',
        suggestedSearch: `${d.category} en ${locationString}`,
        estimatedDensity: d.densityLevel,
      }));
    }

    res.json({
      success: true,
      city: cleanCity,
      country: cleanCountry,
      location: locationString,
      densityProbed: densityData,
      recommendations,
    });
  } catch (err: any) {
    console.error('Error in /recommend-categories:', err.message);
    res.status(500).json({ error: err.message || 'Error al obtener recomendaciones de categorías.' });
  }
});

router.get('/stream', async (req: Request, res: Response) => {
  const searchQuery = (req.query.query as string) || '';
  const limit = parseInt((req.query.limit as string) || '10', 10);
  const city = (req.query.city as string) || '';
  const state = (req.query.state as string) || '';
  const country = (req.query.country as string) || '';

  const session = getUserFromReq(req);
  let userId = session?.userId || (req.query.userId as string) || null;

  if (!searchQuery.trim()) {
    res.status(400).json({ error: 'El parámetro "query" es requerido.' });
    return;
  }

  // Fallback to active admin ID if session token expired or unauthenticated
  if (!userId) {
    try {
      const admin = await get<{ id: string }>('SELECT id FROM users WHERE role = ? LIMIT 1', ['admin']);
      userId = admin?.id || 'admin-001';
    } catch {
      userId = 'admin-001';
    }
  }

  // Setup Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let isClientConnected = true;
  req.on('close', () => {
    isClientConnected = false;
  });

  const sendEvent = (event: string, data: any) => {
    if (!isClientConnected) return;
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (err: any) {
      console.warn('Error sending SSE event:', err.message);
    }
  };

  try {
    const scraped = await scrapeGoogleMaps(
      searchQuery,
      limit,
      async (progress) => {
        sendEvent('progress', progress);

        // If a single lead was just extracted and enriched, save to database immediately with searchQuery & userId
        if (progress.lead) {
          try {
            await saveOrUpdateLead(progress.lead, searchQuery, userId);
          } catch (saveErr: any) {
            console.error(`❌ Error saving lead "${progress.lead.name}" to database:`, saveErr.message);
          }
        }
      },
      {
        city: city || undefined,
        state: state || undefined,
        country: country || undefined,
        strictLocation: true,
      }
    );

    sendEvent('complete', { total: scraped.length, searchQuery });
    res.end();
  } catch (error: any) {
    console.error('Error in /api/search/stream:', error.message);
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
      id, userId, name, phone, cleanPhone, phoneSource, socialPhone, phonesJson, website, address, city, category, searchQuery,
      rating, reviewsCount, googleMapsUrl, placeId, email,
      socialFacebook, socialInstagram, socialLinkedin, socialTiktok, socialTwitter,
      hasWebsite, isOutdatedWebsite, websiteAuditNotes, rankingScore, rankingLevel,
      status, notes, createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
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
      phone = COALESCE(leads.phone, excluded.phone),
      cleanPhone = COALESCE(leads.cleanPhone, excluded.cleanPhone),
      phoneSource = COALESCE(leads.phoneSource, excluded.phoneSource),
      socialPhone = COALESCE(excluded.socialPhone, leads.socialPhone),
      phonesJson = COALESCE(excluded.phonesJson, leads.phonesJson),
      website = excluded.website,
      address = excluded.address,
      city = excluded.city,
      category = excluded.category,
      searchQuery = excluded.searchQuery,
      rating = excluded.rating,
      reviewsCount = excluded.reviewsCount,
      googleMapsUrl = excluded.googleMapsUrl,
      email = COALESCE(leads.email, excluded.email),
      socialFacebook = COALESCE(leads.socialFacebook, excluded.socialFacebook),
      socialInstagram = COALESCE(leads.socialInstagram, excluded.socialInstagram),
      socialLinkedin = COALESCE(leads.socialLinkedin, excluded.socialLinkedin),
      socialTiktok = COALESCE(leads.socialTiktok, excluded.socialTiktok),
      socialTwitter = COALESCE(leads.socialTwitter, excluded.socialTwitter),
      hasWebsite = excluded.hasWebsite,
      isOutdatedWebsite = excluded.isOutdatedWebsite,
      websiteAuditNotes = excluded.websiteAuditNotes,
      rankingScore = excluded.rankingScore,
      rankingLevel = excluded.rankingLevel,
      updatedAt = excluded.updatedAt
    `,
    [
      id,
      ownerId,
      lead.name,
      lead.phone,
      lead.cleanPhone,
      lead.phoneSource || 'Google Maps',
      lead.socialPhone || '',
      lead.phonesJson || '[]',
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
