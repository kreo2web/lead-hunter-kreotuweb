import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.resolve(__dirname, '../../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'leads.db');
const db = new sqlite3.Database(DB_PATH);

export function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export function get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
}

export function run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export const DEFAULT_TEMPLATES = [
  {
    id: 'wa-alto-sinweb',
    name: 'WhatsApp - Sin Sitio Web (Prioridad Alta)',
    type: 'WHATSAPP',
    targetRanking: 'ALTO',
    subject: '',
    content: '¡Hola! 👋 Vi el perfil de *{nombre_negocio}* en Google Maps en {ciudad}. Noté que aún no tienen una página web oficial y muchos clientes que buscan en Google en la zona terminan yéndose con la competencia.\n\nEn *{mi_empresa}* diseñamos páginas web modernas, veloces y adaptadas a celulares que te ayudan a captar clientes todos los días.\n\n¿Te gustaría que te envíe una muestra o propuesta rápida sin compromiso?\n\nSaludos,\n{nombre_remitente} - {mi_empresa}',
    isDefault: 1,
  },
  {
    id: 'wa-medio-webantigua',
    name: 'WhatsApp - Sitio Web Antiguo / No Optimizado (Prioridad Media)',
    type: 'WHATSAPP',
    targetRanking: 'MEDIO',
    subject: '',
    content: '¡Hola! Saludos al equipo de *{nombre_negocio}*. Estuve revisando su sitio web ({sitio_web}) y noté algunos puntos que les pueden estar restando clientes en Google:\n\n{diagnostico_web}\n\nEn *{mi_empresa}* nos especializamos en rediseño web moderno, optimización móvil y velocidad de carga para que su web sea una máquina de ventas.\n\n¿Tienen un momento esta semana para compartirles unas ideas de mejora sin costo?\n\nSaludos,\n{nombre_remitente} - {mi_empresa}',
    isDefault: 1,
  },
  {
    id: 'wa-bajo-seomkt',
    name: 'WhatsApp - SEO y Marketing (Prioridad Baja)',
    type: 'WHATSAPP',
    targetRanking: 'BAJO',
    subject: '',
    content: '¡Hola! Un saludo para *{nombre_negocio}*. Vi que ya cuentan con su sitio web activo ({sitio_web}) y presencia en Google Maps.\n\nEn *{mi_empresa}* ayudamos a negocios de {rubro} en {ciudad} a multiplicar sus ventas posicionándose en el Top 3 de búsquedas en Google y con campañas de marketing digital de alto rendimiento.\n\n¿Están buscando captar más clientes en línea en los próximos meses?\n\nSaludos,\n{nombre_remitente} - {mi_empresa}',
    isDefault: 1,
  },
  {
    id: 'email-alto-sinweb',
    name: 'Email HTML - Oportunidad: Página Web para {nombre_negocio}',
    type: 'EMAIL',
    targetRanking: 'ALTO',
    subject: 'Propuesta de Diseño Web para {nombre_negocio} - {mi_empresa}',
    content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 35px 30px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .content { padding: 30px; color: #334155; line-height: 1.6; font-size: 15px; }
    .highlight-box { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .btn { display: inline-block; background: #0284c7; color: #ffffff !important; text-decoration: none; padding: 14px 28px; font-weight: 600; border-radius: 8px; margin-top: 15px; text-align: center; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Propuesta Especial para {nombre_negocio}</h1>
    </div>
    <div class="content">
      <p>Estimado equipo de <strong>{nombre_negocio}</strong>,</p>
      <p>Buscando empresas de <strong>{rubro}</strong> en <strong>{ciudad}</strong>, encontramos su excelente negocio en Google Maps.</p>
      <div class="highlight-box">
        <p style="margin: 0; font-weight: 600; color: #166534;">🔍 Oportunidad Detectada:</p>
        <p style="margin: 5px 0 0 0; color: #15803d;">Actualmente no cuentan con un sitio web registrado, lo que significa que posibles clientes que los buscan desde sus celulares podrían estar eligiendo a otros competidores en la zona.</p>
      </div>
      <p>En <strong>{mi_empresa}</strong> nos dedicamos al diseño y desarrollo de sitios web profesionales, rápidos y preparados para conseguir clientes reales.</p>
      <p>Nos encantaría preparar una propuesta personalizada o maqueta preliminar para ustedes, totalmente sin costo ni compromiso.</p>
      <div style="text-align: center;">
        <a href="https://wa.me/{telefono_limpio}?text=Hola,%20me%20interesa%20la%20propuesta%20web%20para%20{nombre_negocio}" class="btn">Chatear por WhatsApp</a>
      </div>
    </div>
    <div class="footer">
      <p><strong>{mi_empresa}</strong> • Soluciones Web, SEO y Marketing Digital</p>
      <p><a href="{mi_web}" style="color: #0284c7; text-decoration: none;">{mi_web}</a></p>
    </div>
  </div>
</body>
</html>`,
    isDefault: 1,
  },
  {
    id: 'email-medio-webantigua',
    name: 'Email HTML - Rediseño y Modernización para {nombre_negocio}',
    type: 'EMAIL',
    targetRanking: 'MEDIO',
    subject: 'Diagnóstico Web y Optimización para {nombre_negocio} ({sitio_web})',
    content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 35px 30px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .content { padding: 30px; color: #334155; line-height: 1.6; font-size: 15px; }
    .audit-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .btn { display: inline-block; background: #d97706; color: #ffffff !important; text-decoration: none; padding: 14px 28px; font-weight: 600; border-radius: 8px; margin-top: 15px; text-align: center; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Auditoría Digital de {nombre_negocio}</h1>
    </div>
    <div class="content">
      <p>Hola, equipo de <strong>{nombre_negocio}</strong>,</p>
      <p>Visitamos su sitio web <strong>{sitio_web}</strong> y valoramos mucho su trayectoria en <strong>{ciudad}</strong>.</p>
      <div class="audit-box">
        <p style="margin: 0; font-weight: 600; color: #92400e;">⚠️ Puntos de Mejora Detectados:</p>
        <p style="margin: 5px 0 0 0; color: #b45309;">{diagnostico_web}</p>
      </div>
      <p>Un sitio web que no está 100% optimizado para dispositivos móviles o con tecnologías desactualizadas puede reducir drásticamente la confianza de tus clientes potenciales.</p>
      <p>En <strong>{mi_empresa}</strong> podemos renovar tu presencia digital con un diseño de impacto, máxima velocidad y seguridad.</p>
      <div style="text-align: center;">
        <a href="{mi_web}" class="btn">Conocer más</a>
      </div>
    </div>
    <div class="footer">
      <p><strong>{mi_empresa}</strong> • Desarrollo Web & Marketing</p>
      <p><a href="{mi_web}" style="color: #d97706; text-decoration: none;">{mi_web}</a></p>
    </div>
  </div>
</body>
</html>`,
    isDefault: 1,
  },
];

export async function seedTemplatesForUser(userId: string) {
  for (const t of DEFAULT_TEMPLATES) {
    const existing = await get(
      'SELECT id FROM templates WHERE userId = ? AND (id = ? OR id = ? OR name = ?)',
      [userId, t.id, `${t.id}_${userId}`, t.name]
    );
    if (!existing) {
      const templateId = `${t.id}_${userId}`;
      await run(
        `INSERT INTO templates (id, userId, name, type, targetRanking, subject, content, isDefault, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [templateId, userId, t.name, t.type, t.targetRanking, t.subject, t.content, t.isDefault, new Date().toISOString()]
      );
    }
  }
}

export async function initDatabase() {
  // ─── USERS TABLE ────────────────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      companyName TEXT DEFAULT '',
      companyWebsite TEXT DEFAULT '',
      senderName TEXT DEFAULT '',
      smtpHost TEXT DEFAULT '',
      smtpPort TEXT DEFAULT '587',
      smtpSecure TEXT DEFAULT 'false',
      smtpUser TEXT DEFAULT '',
      smtpPass TEXT DEFAULT '',
      smtpFrom TEXT DEFAULT '',
      createdAt TEXT
    )
  `);

  // ─── LEADS TABLE with composite UNIQUE(userId, placeId) ─────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL DEFAULT 'admin-001',
      name TEXT NOT NULL,
      phone TEXT,
      cleanPhone TEXT,
      website TEXT,
      address TEXT,
      city TEXT,
      category TEXT,
      searchQuery TEXT,
      rating REAL,
      reviewsCount INTEGER,
      googleMapsUrl TEXT,
      placeId TEXT,
      email TEXT,
      socialFacebook TEXT,
      socialInstagram TEXT,
      socialLinkedin TEXT,
      socialTiktok TEXT,
      socialTwitter TEXT,
      hasWebsite INTEGER DEFAULT 0,
      isOutdatedWebsite INTEGER DEFAULT 0,
      websiteAuditNotes TEXT,
      rankingScore INTEGER DEFAULT 0,
      rankingLevel TEXT DEFAULT 'BAJO',
      status TEXT DEFAULT 'NUEVO',
      notes TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      UNIQUE(userId, placeId)
    )
  `);

  // ─── TEMPLATES TABLE ─────────────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      userId TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      targetRanking TEXT NOT NULL,
      subject TEXT,
      content TEXT NOT NULL,
      isDefault INTEGER DEFAULT 0,
      createdAt TEXT
    )
  `);

  // ─── WA CHATS & MESSAGES TABLES ─────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS wa_chats (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      phone TEXT NOT NULL,
      leadId TEXT,
      botActive INTEGER DEFAULT 1,
      lastMessage TEXT,
      lastMessageAt TEXT,
      createdAt TEXT,
      UNIQUE(userId, phone)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS wa_messages (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      chatId TEXT NOT NULL,
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL
    )
  `);

  // ─── USERS COLUMNS MIGRATIONS (AI Bot & Social settings) ────────────────────
  const userColumns = [
    { name: 'geminiApiKey', type: "TEXT DEFAULT ''" },
    { name: 'openaiApiKey', type: "TEXT DEFAULT ''" },
    { name: 'aiApiKey', type: "TEXT DEFAULT ''" },
    { name: 'aiModelName', type: "TEXT DEFAULT ''" },
    { name: 'aiBaseUrl', type: "TEXT DEFAULT ''" },
    { name: 'waBotEnabled', type: 'INTEGER DEFAULT 0' },
    { name: 'waBotName', type: "TEXT DEFAULT 'Asistente Virtual'" },
    { name: 'waBotInstructions', type: "TEXT DEFAULT ''" },
    { name: 'waBotFaqJson', type: "TEXT DEFAULT '[]'" },
    { name: 'waBotProvider', type: "TEXT DEFAULT 'gemini'" },
    { name: 'socialFbCookie', type: "TEXT DEFAULT ''" },
    { name: 'socialIgCookie', type: "TEXT DEFAULT ''" },
  ];

  for (const col of userColumns) {
    try {
      await run(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
    } catch {
      // Column likely already exists
    }
  }

  // ─── SETTINGS TABLE (global/legacy) ─────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // ─── MIGRATION: ensure leads table has UNIQUE(userId, placeId) ──────────────
  try {
    await run("UPDATE leads SET userId = 'admin-001' WHERE userId IS NULL");
    const tableInfo = await get<{ sql: string }>("SELECT sql FROM sqlite_master WHERE type='table' AND name='leads'");
    if (tableInfo && !tableInfo.sql.includes('UNIQUE(userId, placeId)') && !tableInfo.sql.includes('UNIQUE (userId, placeId)')) {
      console.log('🔄 Migrating leads table to composite UNIQUE(userId, placeId)...');
      await run(`
        CREATE TABLE leads_v2 (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL DEFAULT 'admin-001',
          name TEXT NOT NULL,
          phone TEXT,
          cleanPhone TEXT,
          website TEXT,
          address TEXT,
          city TEXT,
          category TEXT,
          searchQuery TEXT,
          rating REAL,
          reviewsCount INTEGER,
          googleMapsUrl TEXT,
          placeId TEXT,
          email TEXT,
          socialFacebook TEXT,
          socialInstagram TEXT,
          socialLinkedin TEXT,
          socialTiktok TEXT,
          socialTwitter TEXT,
          hasWebsite INTEGER DEFAULT 0,
          isOutdatedWebsite INTEGER DEFAULT 0,
          websiteAuditNotes TEXT,
          rankingScore INTEGER DEFAULT 0,
          rankingLevel TEXT DEFAULT 'BAJO',
          status TEXT DEFAULT 'NUEVO',
          notes TEXT,
          createdAt TEXT,
          updatedAt TEXT,
          UNIQUE(userId, placeId)
        )
      `);
      await run(`
        INSERT OR IGNORE INTO leads_v2
        SELECT id, COALESCE(userId, 'admin-001'), name, phone, cleanPhone, website, address, city,
               category, searchQuery, rating, reviewsCount, googleMapsUrl, placeId, email,
               socialFacebook, socialInstagram, socialLinkedin, socialTiktok, socialTwitter,
               hasWebsite, isOutdatedWebsite, websiteAuditNotes, rankingScore, rankingLevel,
               status, notes, createdAt, updatedAt
        FROM leads
      `);
      await run('DROP TABLE leads');
      await run('ALTER TABLE leads_v2 RENAME TO leads');
      await run('CREATE INDEX IF NOT EXISTS idx_leads_user ON leads(userId)');
      await run('CREATE INDEX IF NOT EXISTS idx_leads_user_place ON leads(userId, placeId)');
      console.log('✅ Leads table migrated to UNIQUE(userId, placeId) successfully');
    }
  } catch (err: any) {
    console.warn('Notice verifying leads table constraint:', err.message);
  }

  // ─── ADMIN CHECK ─────────────────────────────────────────────────────────────
  const adminExists = await get<{ id: string }>('SELECT id FROM users WHERE role = ? LIMIT 1', ['admin']);
  if (adminExists) {
    // Assign any unassigned templates to existing admin
    await run("UPDATE templates SET userId = ? WHERE userId IS NULL", [adminExists.id]);
    await seedTemplatesForUser(adminExists.id);
  } else {
    console.log('ℹ️ No hay administrador registrado. El sistema solicitará la configuración inicial en el primer acceso.');
  }

  // Clean up any duplicate templates per user (keeping the earliest record)
  await run(`
    DELETE FROM templates
    WHERE rowid NOT IN (
      SELECT MIN(rowid)
      FROM templates
      GROUP BY userId, name
    )
  `);
}

export default db;
