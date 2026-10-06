import { Router, Request, Response } from 'express';
import { get, run, seedTemplatesForUser } from '../db/database.js';

const router = Router();

// In-memory token store: token -> { userId, username, role }
const validTokens = new Map<string, { userId: string; username: string; role: string }>();

/** Helper to get user session from request headers or query param without throwing */
export function getUserFromReq(req: any): { userId: string; username: string; role: string } | null {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim() || (req.query?.token as string) || '';
  if (!token) return null;
  return validTokens.get(token) || null;
}

/** Middleware: require a valid token */
export function requireAuth(req: any, res: Response, next: () => void) {
  const session = getUserFromReq(req);
  if (!session) {
    res.status(401).json({ error: 'No autenticado. Inicia sesión primero.' });
    return;
  }
  req.user = session;
  next();
}

/** Middleware: require admin role */
export function requireAdmin(req: any, res: Response, next: () => void) {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Acceso restringido. Solo administradores.' });
    return;
  }
  next();
}

// GET /api/auth/setup-status — checks if initial admin has been created
router.get('/setup-status', async (_req: Request, res: Response) => {
  try {
    const admin = await get<{ id: string }>('SELECT id FROM users WHERE role = ? LIMIT 1', ['admin']);
    res.json({ isConfigured: Boolean(admin) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/setup — one-time initial admin setup wizard
router.post('/setup', async (req: Request, res: Response) => {
  try {
    // Security guard: verify if admin already exists
    const existingAdmin = await get<{ id: string }>('SELECT id FROM users WHERE role = ? LIMIT 1', ['admin']);
    if (existingAdmin) {
      res.status(403).json({
        error: 'El sistema ya ha sido configurado previamente. Por seguridad, no se puede volver a ejecutar la instalación.',
      });
      return;
    }

    const { username, password, companyName, companyWebsite, senderName } = req.body;
    if (!username || !username.trim()) {
      res.status(400).json({ error: 'El nombre de usuario del administrador es obligatorio.' });
      return;
    }
    if (!password || password.trim().length < 6) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    const adminId = `admin_${Date.now()}`;
    const cleanUser = username.trim();
    const cleanPass = password.trim();
    const compName = (companyName || '').trim() || 'Kreotuweb.com';
    const compWeb = (companyWebsite || '').trim() || 'https://kreotuweb.com';
    const sendName = (senderName || '').trim() || 'Equipo Kreotuweb';
    const now = new Date().toISOString();

    await run(
      `INSERT INTO users (id, username, password, role, companyName, companyWebsite, senderName, createdAt)
       VALUES (?, ?, ?, 'admin', ?, ?, ?, ?)`,
      [adminId, cleanUser, cleanPass, compName, compWeb, sendName, now]
    );

    // Seed default outreach templates for this new admin
    await seedTemplatesForUser(adminId);

    // Auto-login: generate auth token
    const token = `tkn_${Date.now()}_${Math.random().toString(36).substring(2, 14)}`;
    validTokens.set(token, { userId: adminId, username: cleanUser, role: 'admin' });

    console.log(`✅ Administrador configurado por primera vez: ${cleanUser}`);

    res.json({
      success: true,
      token,
      user: { userId: adminId, username: cleanUser, role: 'admin' },
      message: '¡Administrador y sistema configurados exitosamente!',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
      return;
    }

    const user = await get<{
      id: string;
      username: string;
      password: string;
      role: string;
    }>('SELECT * FROM users WHERE username = ?', [username]);

    if (!user || user.password !== password) {
      res.status(401).json({ error: 'Credenciales inválidas. Verifica usuario o contraseña.' });
      return;
    }

    const token = `tkn_${Date.now()}_${Math.random().toString(36).substring(2, 14)}`;
    validTokens.set(token, { userId: user.id, username: user.username, role: user.role });

    res.json({
      success: true,
      token,
      user: { userId: user.id, username: user.username, role: user.role },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/verify
router.get('/verify', (req: Request, res: Response) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const session = token ? validTokens.get(token) : undefined;

  if (session) {
    res.json({ authenticated: true, user: session });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (token) validTokens.delete(token);
  res.json({ success: true, message: 'Sesión cerrada exitosamente.' });
});

// POST /api/auth/change-password — change own password
router.post('/change-password', async (req: Request, res: Response) => {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    const session = validTokens.get(token);
    if (!session) {
      res.status(401).json({ error: 'No autenticado.' });
      return;
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Contraseña actual y nueva contraseña requeridas.' });
      return;
    }

    const user = await get<{ password: string }>('SELECT password FROM users WHERE id = ?', [session.userId]);
    if (!user || user.password !== currentPassword) {
      res.status(400).json({ error: 'La contraseña actual no es correcta.' });
      return;
    }

    await run('UPDATE users SET password = ? WHERE id = ?', [newPassword, session.userId]);
    res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
