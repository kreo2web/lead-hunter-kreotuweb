import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import { get, query, run } from '../db/database.js';
import { generateAiReply, ChatMessage } from './aiAgentService.js';
import { cleanPhoneNumber } from '../scrapers/gmapsScraper.js';

const SESSIONS_DIR = path.resolve(__dirname, '../../data/wa_sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

interface UserWaState {
  socket: WASocket | null;
  qrDataUrl: string | null;
  isConnected: boolean;
  userPhone: string | null;
  isConnecting: boolean;
  lastError: string | null;
}

const activeSessions = new Map<string, UserWaState>();

export function getWaState(userId: string) {
  const state = activeSessions.get(userId);
  return {
    isConnected: state?.isConnected || false,
    qrDataUrl: state?.qrDataUrl || null,
    userPhone: state?.userPhone || null,
    isConnecting: state?.isConnecting || false,
    lastError: state?.lastError || null,
  };
}

export async function connectWaForUser(userId: string): Promise<{ success: boolean; message: string }> {
  let state = activeSessions.get(userId);
  if (!state) {
    state = {
      socket: null,
      qrDataUrl: null,
      isConnected: false,
      userPhone: null,
      isConnecting: false,
      lastError: null,
    };
    activeSessions.set(userId, state);
  }

  if (state.isConnected && state.socket) {
    return { success: true, message: 'WhatsApp ya se encuentra conectado.' };
  }

  if (state.isConnecting) {
    return { success: true, message: 'Conexión en progreso. Espera el código QR.' };
  }

  state.isConnecting = true;
  state.lastError = null;

  try {
    const userSessionPath = path.join(SESSIONS_DIR, userId);
    if (!fs.existsSync(userSessionPath)) {
      fs.mkdirSync(userSessionPath, { recursive: true });
    }

    const { state: authState, saveCreds } = await useMultiFileAuthState(userSessionPath);

    const logger = pino({ level: 'silent' });

    const sock = makeWASocket({
      auth: authState,
      printQRInTerminal: false,
      logger,
      browser: ['Lead Hunter CRM', 'Chrome', '1.0.0'],
    });

    state.socket = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          state!.qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
        } catch (e: any) {
          console.error('Error generando QR DataURL:', e.message);
        }
      }

      if (connection === 'close') {
        state!.isConnected = false;
        state!.isConnecting = false;
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(`Conexión WA cerrada para usuario ${userId}. Razón: ${statusCode}. Reconectar: ${shouldReconnect}`);

        if (statusCode === DisconnectReason.loggedOut) {
          state!.qrDataUrl = null;
          state!.socket = null;
          try {
            fs.rmSync(userSessionPath, { recursive: true, force: true });
          } catch {}
        } else if (shouldReconnect) {
          // Automatic reconnect after 5s
          setTimeout(() => {
            connectWaForUser(userId).catch(() => {});
          }, 5000);
        }
      } else if (connection === 'open') {
        state!.isConnected = true;
        state!.isConnecting = false;
        state!.qrDataUrl = null;
        const jid = sock.user?.id || '';
        state!.userPhone = jid.split(':')[0] || jid.split('@')[0];
        console.log(`✅ WhatsApp conectado exitosamente para usuario ${userId}: ${state!.userPhone}`);
      }
    });

    // Handle Incoming Messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const m of messages) {
        if (!m.message || m.key.fromMe) continue;

        const remoteJid = m.key.remoteJid;
        if (!remoteJid || remoteJid.includes('@g.us') || remoteJid.includes('status@broadcast')) {
          continue; // Skip group chats and status updates
        }

        const rawPhone = remoteJid.split('@')[0];
        const text =
          m.message.conversation ||
          m.message.extendedTextMessage?.text ||
          m.message.imageMessage?.caption ||
          '';

        if (!text.trim()) continue;

        await handleIncomingWaMessage(userId, rawPhone, remoteJid, text.trim(), sock);
      }
    });

    return { success: true, message: 'Generando código QR para vinculación...' };
  } catch (err: any) {
    state.isConnecting = false;
    state.lastError = err.message;
    throw err;
  }
}

export async function disconnectWaForUser(userId: string): Promise<{ success: boolean; message: string }> {
  const state = activeSessions.get(userId);
  if (state?.socket) {
    try {
      await state.socket.logout();
    } catch {}
    try {
      state.socket.end(undefined);
    } catch {}
  }
  if (state) {
    state.isConnected = false;
    state.isConnecting = false;
    state.qrDataUrl = null;
    state.socket = null;
  }

  const userSessionPath = path.join(SESSIONS_DIR, userId);
  try {
    if (fs.existsSync(userSessionPath)) {
      fs.rmSync(userSessionPath, { recursive: true, force: true });
    }
  } catch {}

  return { success: true, message: 'Sesión de WhatsApp cerrada exitosamente.' };
}

async function handleIncomingWaMessage(
  userId: string,
  rawPhone: string,
  remoteJid: string,
  incomingText: string,
  sock: WASocket
) {
  try {
    const cleanPh = cleanPhoneNumber(rawPhone) || rawPhone;

    // Check user settings
    const user = await get<any>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return;

    // Find if this phone matches any lead in user's leads
    const lead = await get<any>(
      `SELECT * FROM leads 
       WHERE userId = ? AND (cleanPhone = ? OR cleanPhone LIKE ? OR phone LIKE ?) 
       ORDER BY createdAt DESC LIMIT 1`,
      [userId, cleanPh, `%${cleanPh.slice(-8)}%`, `%${cleanPh.slice(-8)}%`]
    );

    // Upsert chat
    const chatId = `${userId}_${cleanPh}`;
    const now = new Date().toISOString();
    await run(
      `INSERT INTO wa_chats (id, userId, phone, leadId, botActive, lastMessage, lastMessageAt, createdAt)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?)
       ON CONFLICT(userId, phone) DO UPDATE SET
         lastMessage = excluded.lastMessage,
         lastMessageAt = excluded.lastMessageAt,
         leadId = COALESCE(excluded.leadId, wa_chats.leadId)`,
      [chatId, userId, cleanPh, lead?.id || null, incomingText, now, now]
    );

    // Save incoming message
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await run(
      `INSERT INTO wa_messages (id, userId, chatId, sender, content, timestamp)
       VALUES (?, ?, ?, 'lead', ?, ?)`,
      [msgId, userId, chatId, incomingText, now]
    );

    // Check if Bot is active for user and for this specific chat
    const chatRecord = await get<any>('SELECT botActive FROM wa_chats WHERE id = ?', [chatId]);
    const isBotActiveForChat = chatRecord ? chatRecord.botActive === 1 : true;

    if (!user.waBotEnabled || !isBotActiveForChat) {
      console.log(`Robot desactivado para el usuario ${userId} o en pausa para el chat ${cleanPh}`);
      return;
    }

    // Build chat history for AI context
    const recentDbMessages = await query<any>(
      `SELECT sender, content FROM wa_messages 
       WHERE chatId = ? 
       ORDER BY timestamp DESC LIMIT 8`,
      [chatId]
    );

    const history: ChatMessage[] = recentDbMessages.reverse().map((m) => ({
      role: m.sender === 'lead' ? 'user' : 'assistant',
      content: m.content,
    }));

    // Parse user FAQs
    let faqs: any[] = [];
    try {
      if (user.waBotFaqJson) faqs = JSON.parse(user.waBotFaqJson);
    } catch {}

    // Generate AI response
    console.log(`🤖 Generando respuesta de IA (${user.waBotProvider || 'gemini'}) para prospecto ${lead?.name || cleanPh}...`);
    const aiResponse = await generateAiReply(history, incomingText, {
      provider: user.waBotProvider || 'gemini',
      apiKey: user.aiApiKey || (user.waBotProvider === 'openai' ? user.openaiApiKey : user.geminiApiKey),
      modelName: user.aiModelName || undefined,
      baseUrl: user.aiBaseUrl || undefined,
      geminiApiKey: user.geminiApiKey,
      openaiApiKey: user.openaiApiKey,
      botName: user.waBotName || 'Asistente Virtual',
      companyName: user.companyName || 'Kreotuweb',
      companyWebsite: user.companyWebsite || '',
      instructions: user.waBotInstructions || '',
      faqs,
      leadContext: {
        name: lead?.name,
        city: lead?.city,
        category: lead?.category,
      },
    });

    // Simulate typing delay (2 to 4 seconds) to appear natural
    const delayMs = Math.floor(Math.random() * 2000) + 2500;
    await new Promise((r) => setTimeout(r, delayMs));

    // Send reply via Baileys WhatsApp
    await sock.sendMessage(remoteJid, { text: aiResponse });

    // Save bot reply
    const botMsgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const botNow = new Date().toISOString();
    await run(
      `INSERT INTO wa_messages (id, userId, chatId, sender, content, timestamp)
       VALUES (?, ?, ?, 'bot', ?, ?)`,
      [botMsgId, userId, chatId, aiResponse, botNow]
    );

    await run(
      `UPDATE wa_chats 
       SET lastMessage = ?, lastMessageAt = ? 
       WHERE id = ?`,
      [aiResponse, botNow, chatId]
    );

    // Update lead status to CONTACTADO_WA or similar
    if (lead) {
      await run(
        `UPDATE leads 
         SET status = 'CONTACTADO_WA', 
             notes = COALESCE(notes || '\n', '') || '[IA Bot WA]: ' || ?
         WHERE id = ?`,
        [`Respondido por IA: "${aiResponse.slice(0, 80)}..."`, lead.id]
      );
    }

    console.log(`✅ Respuesta IA enviada a ${cleanPh}: "${aiResponse}"`);
  } catch (err: any) {
    console.error('Error procesando mensaje entrante de WhatsApp con IA:', err.message);
  }
}
