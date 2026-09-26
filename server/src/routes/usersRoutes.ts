import { Router, Request, Response } from 'express';
import { query, get, run, seedTemplatesForUser } from '../db/database.js';
import { requireAuth, requireAdmin } from './authRoutes.js';

const router = Router();

// GET /api/users — list all users (admin only)
router.get('/', requireAuth as any, requireAdmin as any, async (req: Request, res: Response) => {
  try {
    const users = await query<{
      id: string;
      username: string;
      role: string;
      companyName: string;
      companyWebsite: string;
      senderName: string;
      smtpHost: string;
      smtpPort: string;
      smtpSecure: string;
      smtpUser: string;
      smtpFrom: string;
      createdAt: string;
    }>(`SELECT id, username, role, companyName, companyWebsite, senderName,
              smtpHost, smtpPort, smtpSecure, smtpUser, smtpFrom, createdAt
        FROM users ORDER BY role DESC, createdAt ASC`);
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users — create user (admin only)
router.post('/', requireAuth as any, requireAdmin as any, async (req: Request, res: Response) => {
  try {
    const {
      username, password, role = 'user',
      companyName = '', companyWebsite = '', senderName = '',
      smtpHost = '', smtpPort = '587', smtpSecure = 'false',
      smtpUser = '', smtpPass = '', smtpFrom = '',
    } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
      return;
    }

    const existing = await get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      res.status(409).json({ error: `El usuario "${username}" ya existe.` });
      return;
    }

    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await run(
      `INSERT INTO users (id, username, password, role, companyName, companyWebsite, senderName,
         smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFrom, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, username, password, role, companyName, companyWebsite, senderName,
       smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFrom, new Date().toISOString()]
    );

    // Seed default starter templates for the new user
    await seedTemplatesForUser(id);

    res.status(201).json({ success: true, id, username, role });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id — update user (admin) or self-update profile
router.put('/:id', requireAuth as any, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    // Users can only update themselves; admins can update anyone
    if (req.user.role !== 'admin' && req.user.userId !== id) {
      res.status(403).json({ error: 'No tienes permiso para modificar este usuario.' });
      return;
    }

    const {
      password, role,
      companyName, companyWebsite, senderName,
      smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFrom,
    } = req.body;

    const existing = await get<{ id: string; role: string }>('SELECT id, role FROM users WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    // Build dynamic update
    const fields: string[] = [];
    const values: any[] = [];

    if (password && password !== '********') { fields.push('password = ?'); values.push(password); }
    // Only admin can change roles; prevent demoting the last admin
    if (role !== undefined && req.user.role === 'admin') {
      if (existing.role === 'admin' && role !== 'admin') {
        const adminCount = (await get<{ c: number }>('SELECT COUNT(*) as c FROM users WHERE role = ?', ['admin']))?.c || 0;
        if (adminCount <= 1) {
          res.status(400).json({ error: 'No puedes degradar al único administrador del sistema.' });
          return;
        }
      }
      fields.push('role = ?'); values.push(role);
    }
    if (companyName !== undefined) { fields.push('companyName = ?'); values.push(companyName); }
    if (companyWebsite !== undefined) { fields.push('companyWebsite = ?'); values.push(companyWebsite); }
    if (senderName !== undefined) { fields.push('senderName = ?'); values.push(senderName); }
    if (smtpHost !== undefined) { fields.push('smtpHost = ?'); values.push(smtpHost); }
    if (smtpPort !== undefined) { fields.push('smtpPort = ?'); values.push(smtpPort); }
    if (smtpSecure !== undefined) { fields.push('smtpSecure = ?'); values.push(smtpSecure); }
    if (smtpUser !== undefined) { fields.push('smtpUser = ?'); values.push(smtpUser); }
    if (smtpPass !== undefined && smtpPass !== '********') { fields.push('smtpPass = ?'); values.push(smtpPass); }
    if (smtpFrom !== undefined) { fields.push('smtpFrom = ?'); values.push(smtpFrom); }

    if (fields.length === 0) {
      res.json({ success: true, message: 'Sin cambios.' });
      return;
    }

    values.push(id);
    await run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ success: true, message: 'Usuario actualizado correctamente.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id — delete user (admin only)
router.delete('/:id', requireAuth as any, requireAdmin as any, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const user = await get<{ role: string }>('SELECT role FROM users WHERE id = ?', [id]);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }
    if (user.role === 'admin' && req.user.userId === id) {
      res.status(400).json({ error: 'No puedes eliminar tu propia cuenta de administrador.' });
      return;
    }

    await run('DELETE FROM leads WHERE userId = ?', [id]);
    await run('DELETE FROM templates WHERE userId = ?', [id]);
    await run('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true, message: 'Usuario y sus datos asociados eliminados.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/me/settings — get current user's SMTP/company settings
router.get('/me/settings', requireAuth as any, async (req: any, res: Response) => {
  try {
    const user = await get<{
      companyName: string; companyWebsite: string; senderName: string;
      smtpHost: string; smtpPort: string; smtpSecure: string;
      smtpUser: string; smtpPass: string; smtpFrom: string;
    }>(`SELECT companyName, companyWebsite, senderName, smtpHost, smtpPort,
              smtpSecure, smtpUser, smtpPass, smtpFrom
        FROM users WHERE id = ?`, [req.user.userId]);

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    const result: any = { ...user };
    if (result.smtpPass) {
      result.smtp_pass_set = 'true';
      result.smtpPass = '********';
    } else {
      result.smtp_pass_set = 'false';
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
