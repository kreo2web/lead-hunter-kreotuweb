import { Router, Request, Response } from 'express';
import { requireAuth, getUserFromReq } from './authRoutes.js';
import {
  getWaState,
  connectWaForUser,
  disconnectWaForUser,
} from '../services/whatsappService.js';
import { generateAiReply } from '../services/aiAgentService.js';
import { get, query, run } from '../db/database.js';

const router = Router();
router.use(requireAuth);

// Get current WhatsApp connection status & QR if waiting
router.get('/status', (req: Request, res: Response) => {
  const session = getUserFromReq(req);
  if (!session) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }
  const state = getWaState(session.userId);
  res.json({ success: true, ...state });
});

// Trigger connection attempt
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const session = getUserFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }
    const result = await connectWaForUser(session.userId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Disconnect WhatsApp session
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const session = getUserFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }
    const result = await disconnectWaForUser(session.userId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Test AI Agent reply in simulator
router.post('/test-ai', async (req: Request, res: Response) => {
  try {
    const session = getUserFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const { message, instructions, faqs, botName, provider, geminiApiKey, openaiApiKey } = req.body;
    if (!message || !message.trim()) {
      res.status(400).json({ error: 'El mensaje de prueba es obligatorio.' });
      return;
    }

    const user = await get<any>('SELECT * FROM users WHERE id = ?', [session.userId]);
    const finalProvider = provider || user?.waBotProvider || 'gemini';
    const finalGeminiKey = geminiApiKey || user?.geminiApiKey;
    const finalOpenAiKey = openaiApiKey || user?.openaiApiKey;

    const reply = await generateAiReply(
      [],
      message.trim(),
      {
        provider: finalProvider,
        geminiApiKey: finalGeminiKey,
        openaiApiKey: finalOpenAiKey,
        botName: botName || user?.waBotName || 'Asistente Virtual',
        companyName: user?.companyName || 'Kreotuweb',
        companyWebsite: user?.companyWebsite || '',
        instructions: instructions || user?.waBotInstructions || '',
        faqs: Array.isArray(faqs) ? faqs : (user?.waBotFaqJson ? JSON.parse(user.waBotFaqJson) : []),
        leadContext: {
          name: 'Negocio de Prueba',
          city: 'Madrid',
          category: 'Restaurante',
        },
      }
    );

    res.json({ success: true, reply });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's chats
router.get('/chats', async (req: Request, res: Response) => {
  try {
    const session = getUserFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const chats = await query(
      `SELECT c.*, l.name as leadName, l.rankingLevel 
       FROM wa_chats c 
       LEFT JOIN leads l ON c.leadId = l.id 
       WHERE c.userId = ? 
       ORDER BY c.lastMessageAt DESC`,
      [session.userId]
    );

    res.json({ success: true, chats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages for a chat
router.get('/chats/:chatId/messages', async (req: Request, res: Response) => {
  try {
    const session = getUserFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const { chatId } = req.params;
    const messages = await query(
      `SELECT * FROM wa_messages 
       WHERE userId = ? AND chatId = ? 
       ORDER BY timestamp ASC`,
      [session.userId, chatId]
    );

    res.json({ success: true, messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle bot active state for a chat
router.post('/chats/:chatId/toggle-bot', async (req: Request, res: Response) => {
  try {
    const session = getUserFromReq(req);
    if (!session) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const { chatId } = req.params;
    const chat = await get<any>('SELECT botActive FROM wa_chats WHERE id = ? AND userId = ?', [chatId, session.userId]);
    if (!chat) {
      res.status(404).json({ error: 'Chat no encontrado' });
      return;
    }

    const newBotActive = chat.botActive === 1 ? 0 : 1;
    await run('UPDATE wa_chats SET botActive = ? WHERE id = ? AND userId = ?', [newBotActive, chatId, session.userId]);

    res.json({ success: true, botActive: newBotActive });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
