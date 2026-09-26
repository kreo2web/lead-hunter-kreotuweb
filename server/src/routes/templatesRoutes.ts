import { Router, Request, Response } from 'express';
import { query, get, run } from '../db/database.js';
import { replaceVariables, getSettingsMap } from '../services/emailService.js';
import { v4 as uuidv4 } from 'uuid';
import { getUserFromReq } from './authRoutes.js';

const router = Router();

// List templates for current user
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    const session = getUserFromReq(req);
    const userId = session?.userId || 'admin-001';

    let sql = 'SELECT * FROM templates WHERE userId = ?';
    const params: any[] = [userId];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    sql += ' ORDER BY isDefault DESC, name ASC';
    const rows = await query(sql, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create template for current user
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, type, targetRanking, subject, content } = req.body;
    const session = getUserFromReq(req);
    const userId = session?.userId || 'admin-001';

    if (!name || !type || !content) {
      res.status(400).json({ error: 'Nombre, tipo y contenido son obligatorios.' });
      return;
    }
    const id = uuidv4();
    const now = new Date().toISOString();

    await run(
      'INSERT INTO templates (id, userId, name, type, targetRanking, subject, content, isDefault, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)',
      [id, userId, name, type, targetRanking || 'TODOS', subject || '', content, now]
    );

    const created = await get('SELECT * FROM templates WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update template (must belong to user or admin)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const session = getUserFromReq(req);
    const existing = await get<any>('SELECT userId FROM templates WHERE id = ?', [req.params.id]);
    if (!existing) {
      res.status(404).json({ error: 'Plantilla no encontrada.' });
      return;
    }
    if (session && session.role === 'user' && existing.userId !== session.userId) {
      res.status(403).json({ error: 'No tienes permiso para modificar esta plantilla.' });
      return;
    }

    const { name, type, targetRanking, subject, content, isDefault } = req.body;
    await run(
      'UPDATE templates SET name = ?, type = ?, targetRanking = ?, subject = ?, content = ?, isDefault = ? WHERE id = ?',
      [name, type, targetRanking, subject || '', content, isDefault ? 1 : 0, req.params.id]
    );
    const updated = await get('SELECT * FROM templates WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete template (must belong to user or admin)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const session = getUserFromReq(req);
    const existing = await get<any>('SELECT userId FROM templates WHERE id = ?', [req.params.id]);
    if (!existing) {
      res.status(404).json({ error: 'Plantilla no encontrada.' });
      return;
    }
    if (session && session.role === 'user' && existing.userId !== session.userId) {
      res.status(403).json({ error: 'No tienes permiso para eliminar esta plantilla.' });
      return;
    }

    await run('DELETE FROM templates WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Preview template with a lead
router.post('/preview', async (req: Request, res: Response) => {
  try {
    const { content, subject, lead } = req.body;
    const settings = await getSettingsMap();

    const renderedSubject = replaceVariables(subject || '', lead || {}, settings);
    const renderedContent = replaceVariables(content || '', lead || {}, settings);

    res.json({ subject: renderedSubject, content: renderedContent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
