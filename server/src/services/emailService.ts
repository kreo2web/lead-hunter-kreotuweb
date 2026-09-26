import nodemailer from 'nodemailer';
import { get, query } from '../db/database.js';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  lead: any;
}

export interface EmailOptionsWithUser extends EmailOptions {
  userId: string;
}

// ─── LEGACY: global settings map (kept for backward compatibility) ───────────
export async function getSettingsMap(): Promise<Record<string, string>> {
  const rows = await query<{ key: string; value: string }>('SELECT key, value FROM settings');
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] = row.value || '';
  }
  return map;
}

// ─── Per-user SMTP settings from users table ─────────────────────────────────
export async function getUserSmtp(userId: string) {
  const user = await get<{
    companyName: string; companyWebsite: string; senderName: string;
    smtpHost: string; smtpPort: string; smtpSecure: string;
    smtpUser: string; smtpPass: string; smtpFrom: string;
  }>(`SELECT companyName, companyWebsite, senderName, smtpHost, smtpPort,
            smtpSecure, smtpUser, smtpPass, smtpFrom
      FROM users WHERE id = ?`, [userId]);

  if (!user) throw new Error('Usuario no encontrado.');
  return user;
}

export function replaceVariables(text: string, lead: any, settings: Record<string, string>): string {
  if (!text) return '';
  return text
    .replace(/{nombre_negocio}/g, lead.name || '')
    .replace(/{telefono}/g, lead.phone || '')
    .replace(/{telefono_limpio}/g, lead.cleanPhone || '')
    .replace(/{sitio_web}/g, lead.website || 'No registrado')
    .replace(/{ciudad}/g, lead.city || 'su ciudad')
    .replace(/{direccion}/g, lead.address || '')
    .replace(/{rubro}/g, lead.category || 'su rubro comercial')
    .replace(/{calificacion}/g, lead.rating ? `${lead.rating} ⭐` : '')
    .replace(/{diagnostico_web}/g, lead.websiteAuditNotes || 'Sin observaciones')
    .replace(/{ranking_nivel}/g, lead.rankingLevel || '')
    .replace(/{mi_empresa}/g, settings['company_name'] || 'Kreotuweb.com')
    .replace(/{mi_web}/g, settings['company_website'] || 'https://kreotuweb.com')
    .replace(/{nombre_remitente}/g, settings['sender_name'] || 'Equipo Kreotuweb');
}

function replaceVarsFromUser(text: string, lead: any, user: {
  companyName: string; companyWebsite: string; senderName: string;
}): string {
  if (!text) return '';
  return text
    .replace(/{nombre_negocio}/g, lead.name || '')
    .replace(/{telefono}/g, lead.phone || '')
    .replace(/{telefono_limpio}/g, lead.cleanPhone || '')
    .replace(/{sitio_web}/g, lead.website || 'No registrado')
    .replace(/{ciudad}/g, lead.city || 'su ciudad')
    .replace(/{direccion}/g, lead.address || '')
    .replace(/{rubro}/g, lead.category || 'su rubro comercial')
    .replace(/{calificacion}/g, lead.rating ? `${lead.rating} ⭐` : '')
    .replace(/{diagnostico_web}/g, lead.websiteAuditNotes || 'Sin observaciones')
    .replace(/{ranking_nivel}/g, lead.rankingLevel || '')
    .replace(/{mi_empresa}/g, user.companyName || 'Kreotuweb.com')
    .replace(/{mi_web}/g, user.companyWebsite || 'https://kreotuweb.com')
    .replace(/{nombre_remitente}/g, user.senderName || 'Equipo Kreotuweb');
}

// ─── Create transporter from user record ─────────────────────────────────────
export async function createTransporterForUser(userId: string) {
  const user = await getUserSmtp(userId);
  const host = user.smtpHost;
  const port = parseInt(user.smtpPort || '587', 10);
  const secure = user.smtpSecure === 'true' || port === 465;

  if (!host || !user.smtpUser || !user.smtpPass) {
    throw new Error('Configuración SMTP incompleta. Por favor configure el servidor SMTP en los Ajustes.');
  }

  return { transporter: nodemailer.createTransport({
    host, port, secure,
    auth: { user: user.smtpUser, pass: user.smtpPass },
    tls: { rejectUnauthorized: false },
  }), user };
}

// ─── Legacy createTransporter (uses global settings) ─────────────────────────
export async function createTransporter() {
  const settings = await getSettingsMap();
  const host = settings['smtp_host'];
  const port = parseInt(settings['smtp_port'] || '587', 10);
  const secure = settings['smtp_secure'] === 'true' || port === 465;
  const user = settings['smtp_user'];
  const pass = settings['smtp_pass'];

  if (!host || !user || !pass) {
    throw new Error('Configuración SMTP incompleta. Por favor configure el servidor SMTP en los Ajustes.');
  }

  return nodemailer.createTransport({
    host, port, secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

// ─── Test SMTP for a specific user ───────────────────────────────────────────
export async function testSmtpConnectionForUser(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    const { transporter } = await createTransporterForUser(userId);
    await transporter.verify();
    return { success: true, message: 'Conexión SMTP exitosa. El servidor está listo para enviar correos.' };
  } catch (error: any) {
    return { success: false, message: `Fallo de conexión SMTP: ${error.message}` };
  }
}

// ─── Legacy test (global settings) ───────────────────────────────────────────
export async function testSmtpConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = await createTransporter();
    await transporter.verify();
    return { success: true, message: 'Conexión SMTP exitosa. El servidor está listo para enviar correos.' };
  } catch (error: any) {
    return { success: false, message: `Fallo de conexión SMTP: ${error.message}` };
  }
}

// ─── Send email for a specific user ──────────────────────────────────────────
export async function sendProspectEmailForUser(options: EmailOptionsWithUser): Promise<{ success: boolean; messageId?: string }> {
  const { transporter, user } = await createTransporterForUser(options.userId);

  const renderedSubject = replaceVarsFromUser(options.subject, options.lead, user);
  const renderedHtml = replaceVarsFromUser(options.html, options.lead, user);

  const fromAddress = user.smtpFrom || user.smtpUser;
  const senderName = user.senderName || 'Kreotuweb.com';

  const info = await transporter.sendMail({
    from: `"${senderName}" <${fromAddress}>`,
    to: options.to,
    subject: renderedSubject,
    html: renderedHtml,
  });
  return { success: true, messageId: info.messageId };
}

// ─── Legacy send email (global settings) ─────────────────────────────────────
export async function sendProspectEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string }> {
  const settings = await getSettingsMap();
  const transporter = await createTransporter();

  const renderedSubject = replaceVariables(options.subject, options.lead, settings);
  const renderedHtml = replaceVariables(options.html, options.lead, settings);

  const fromAddress = settings['smtp_from'] || settings['smtp_user'];
  const senderName = settings['sender_name'] || 'Kreotuweb.com';

  const info = await transporter.sendMail({
    from: `"${senderName}" <${fromAddress}>`,
    to: options.to,
    subject: renderedSubject,
    html: renderedHtml,
  });
  return { success: true, messageId: info.messageId };
}
