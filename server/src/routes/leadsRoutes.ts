import { Router, Request, Response } from 'express';
import { query, get, run } from '../db/database.js';
import { generateExcelBuffer, generateCsvString } from '../services/exportService.js';
import { getUserFromReq } from './authRoutes.js';

const router = Router();

/** Helper: calculate user scoping clause and params */
function getUserScope(req: Request): { sqlClause: string; params: any[] } {
  const session = getUserFromReq(req);
  const requestedUserId = req.query.userId as string | undefined;

  if (session && session.role === 'user') {
    // Normal user: strictly isolated to their own leads
    return {
      sqlClause: ' AND userId = ?',
      params: [session.userId],
    };
  }

  if (session && session.role === 'admin') {
    if (requestedUserId && requestedUserId !== 'ME' && requestedUserId !== 'ALL') {
      // Admin inspecting a specific client's leads
      return {
        sqlClause: ' AND userId = ?',
        params: [requestedUserId],
      };
    } else if (requestedUserId === 'ALL') {
      // Admin viewing all leads across the system
      return {
        sqlClause: '',
        params: [],
      };
    } else {
      // Admin default: view own private leads
      return {
        sqlClause: ' AND userId = ?',
        params: [session.userId],
      };
    }
  }

  // Fallback for unauthenticated
  return {
    sqlClause: " AND userId = 'admin-001'",
    params: [],
  };
}

// Stats summary
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const scope = getUserScope(req);
    const where = `WHERE 1=1 ${scope.sqlClause}`;

    const total = (await get<{ count: number }>(`SELECT COUNT(*) as count FROM leads ${where}`, scope.params))?.count || 0;
    const alto = (await get<{ count: number }>(`SELECT COUNT(*) as count FROM leads ${where} AND rankingLevel = 'ALTO'`, scope.params))?.count || 0;
    const medio = (await get<{ count: number }>(`SELECT COUNT(*) as count FROM leads ${where} AND rankingLevel = 'MEDIO'`, scope.params))?.count || 0;
    const bajo = (await get<{ count: number }>(`SELECT COUNT(*) as count FROM leads ${where} AND rankingLevel = 'BAJO'`, scope.params))?.count || 0;
    const withPhone = (await get<{ count: number }>(`SELECT COUNT(*) as count FROM leads ${where} AND phone IS NOT NULL AND phone != ''`, scope.params))?.count || 0;
    const withEmail = (await get<{ count: number }>(`SELECT COUNT(*) as count FROM leads ${where} AND email IS NOT NULL AND email != ''`, scope.params))?.count || 0;
    const contacted = (await get<{ count: number }>(`SELECT COUNT(*) as count FROM leads ${where} AND status IN ('CONTACTADO_WA', 'CONTACTADO_EMAIL')`, scope.params))?.count || 0;

    res.json({ total, alto, medio, bajo, withPhone, withEmail, contacted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List unique search queries / campaigns for current scope
router.get('/searches', async (req: Request, res: Response) => {
  try {
    const scope = getUserScope(req);
    const rows = await query<{ searchQuery: string }>(
      `SELECT DISTINCT searchQuery FROM leads WHERE searchQuery IS NOT NULL AND searchQuery != '' ${scope.sqlClause} ORDER BY searchQuery ASC`,
      scope.params
    );
    const searches = rows.map((r) => r.searchQuery);
    res.json(searches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List leads with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { ranking, status, hasWebsite, hasPhone, hasEmail, search, searchQuery } = req.query;
    const scope = getUserScope(req);

    let sql = `SELECT * FROM leads WHERE 1=1 ${scope.sqlClause}`;
    const params: any[] = [...scope.params];

    if (ranking && ranking !== 'ALL') {
      sql += ' AND rankingLevel = ?';
      params.push(ranking);
    }

    if (status && status !== 'ALL') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (searchQuery && searchQuery !== 'ALL') {
      sql += ' AND searchQuery = ?';
      params.push(searchQuery);
    }

    if (hasWebsite === 'true') {
      sql += ' AND hasWebsite = 1';
    } else if (hasWebsite === 'false') {
      sql += ' AND hasWebsite = 0';
    }

    if (hasPhone === 'true') {
      sql += " AND phone IS NOT NULL AND phone != ''";
    }

    if (hasEmail === 'true') {
      sql += " AND email IS NOT NULL AND email != ''";
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      sql += ' AND (name LIKE ? OR category LIKE ? OR city LIKE ? OR address LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY rankingScore DESC, createdAt DESC';

    const leads = await query(sql, params);
    res.json(leads);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Single lead
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const session = getUserFromReq(req);
    const lead = await get<any>('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (!lead) {
      res.status(404).json({ error: 'Prospecto no encontrado.' });
      return;
    }
    if (session && session.role === 'user' && lead.userId !== session.userId) {
      res.status(403).json({ error: 'No tienes permiso para ver este prospecto.' });
      return;
    }
    res.json(lead);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update lead
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const session = getUserFromReq(req);
    const lead = await get<any>('SELECT userId FROM leads WHERE id = ?', [req.params.id]);
    if (!lead) {
      res.status(404).json({ error: 'Prospecto no encontrado.' });
      return;
    }
    if (session && session.role === 'user' && lead.userId !== session.userId) {
      res.status(403).json({ error: 'No tienes permiso para modificar este prospecto.' });
      return;
    }

    const { status, notes } = req.body;
    const updates: string[] = [];
    const params: any[] = [];

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No se enviaron campos para actualizar.' });
      return;
    }

    updates.push('updatedAt = ?');
    params.push(new Date().toISOString());
    params.push(req.params.id);

    await run(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`, params);
    const updated = await get('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete lead
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const session = getUserFromReq(req);
    const lead = await get<any>('SELECT userId FROM leads WHERE id = ?', [req.params.id]);
    if (!lead) {
      res.status(404).json({ error: 'Prospecto no encontrado.' });
      return;
    }
    if (session && session.role === 'user' && lead.userId !== session.userId) {
      res.status(403).json({ error: 'No tienes permiso para eliminar este prospecto.' });
      return;
    }

    await run('DELETE FROM leads WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Prospecto eliminado.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Clear all leads for current scope
router.delete('/', async (req: Request, res: Response) => {
  try {
    const scope = getUserScope(req);
    if (scope.sqlClause) {
      await run(`DELETE FROM leads WHERE 1=1 ${scope.sqlClause}`, scope.params);
    } else {
      await run('DELETE FROM leads');
    }
    res.json({ success: true, message: 'Prospectos eliminados.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export to Excel
router.get('/export/excel', async (req: Request, res: Response) => {
  try {
    const scope = getUserScope(req);
    const leads = await query(
      `SELECT * FROM leads WHERE 1=1 ${scope.sqlClause} ORDER BY rankingScore DESC, createdAt DESC`,
      scope.params
    );
    const buffer = generateExcelBuffer(leads);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="prospectos_${Date.now()}.xlsx"`);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export to CSV
router.get('/export/csv', async (req: Request, res: Response) => {
  try {
    const scope = getUserScope(req);
    const leads = await query(
      `SELECT * FROM leads WHERE 1=1 ${scope.sqlClause} ORDER BY rankingScore DESC, createdAt DESC`,
      scope.params
    );
    const csv = generateCsvString(leads);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="prospectos_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Enrich individual lead using Social Networks (Facebook / Instagram)
router.post('/:id/enrich-social', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = getUserFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const lead = await get<any>(
      `SELECT * FROM leads WHERE id = ? ${session.role === 'admin' ? '' : 'AND userId = ?'}`,
      session.role === 'admin' ? [id] : [id, session.userId]
    );

    if (!lead) {
      res.status(404).json({ error: 'Prospecto no encontrado' });
      return;
    }

    // Get user social cookies if any
    const userRow = await get<any>('SELECT socialFbCookie, socialIgCookie FROM users WHERE id = ?', [session.userId]);
    const { enrichLeadFromSocial } = await import('../scrapers/socialEnricher.js');

    const socialResult = await enrichLeadFromSocial(
      {
        name: lead.name,
        city: lead.city,
        phone: lead.phone,
        email: lead.email,
        socialFacebook: lead.socialFacebook,
        socialInstagram: lead.socialInstagram,
      },
      {
        socialFbCookie: userRow?.socialFbCookie || '',
        socialIgCookie: userRow?.socialIgCookie || '',
      }
    );

    const now = new Date().toISOString();
    await run(
      `UPDATE leads 
       SET email = COALESCE(?, email),
           phone = COALESCE(?, phone),
           cleanPhone = COALESCE(?, cleanPhone),
           socialFacebook = COALESCE(?, socialFacebook),
           socialInstagram = COALESCE(?, socialInstagram),
           updatedAt = ?
       WHERE id = ?`,
      [
        socialResult.email,
        socialResult.phone,
        socialResult.cleanPhone,
        socialResult.socialFacebook,
        socialResult.socialInstagram,
        now,
        id
      ]
    );

    const updatedLead = await get('SELECT * FROM leads WHERE id = ?', [id]);
    res.json({
      success: true,
      lead: updatedLead,
      foundSources: socialResult.foundSources,
      message: socialResult.foundSources.length > 0 
        ? `Contacto enriquecido: ${socialResult.foundSources.join(', ')}` 
        : 'No se encontraron datos de contacto adicionales en redes sociales.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
