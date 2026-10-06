import { Router, Request, Response } from 'express';
import { run, get } from '../db/database.js';
import { testSmtpConnectionForUser, sendProspectEmailForUser, getUserSmtp } from '../services/emailService.js';
import { requireAuth } from './authRoutes.js';

const router = Router();

// GET /api/settings — return current user's SMTP, company, AI & social settings
router.get('/', requireAuth as any, async (req: any, res: Response) => {
  try {
    const user = await get<any>(
      `SELECT companyName, companyWebsite, senderName, smtpHost, smtpPort,
              smtpSecure, smtpUser, smtpPass, smtpFrom,
              geminiApiKey, openaiApiKey, aiApiKey, aiModelName, aiBaseUrl,
              waBotEnabled, waBotName, waBotInstructions, waBotFaqJson, waBotProvider,
              socialFbCookie, socialIgCookie
       FROM users WHERE id = ?`,
      [req.user.userId]
    );

    if (!user) { res.status(404).json({ error: 'Usuario no encontrado.' }); return; }

    const result: Record<string, any> = {
      company_name: user.companyName || '',
      company_website: user.companyWebsite || '',
      sender_name: user.senderName || '',
      smtp_host: user.smtpHost || '',
      smtp_port: user.smtpPort || '587',
      smtp_secure: user.smtpSecure || 'false',
      smtp_user: user.smtpUser || '',
      smtp_from: user.smtpFrom || '',
      gemini_api_key: user.geminiApiKey || '',
      openai_api_key: user.openaiApiKey || '',
      ai_api_key: user.aiApiKey || '',
      ai_model_name: user.aiModelName || '',
      ai_base_url: user.aiBaseUrl || '',
      wa_bot_enabled: user.waBotEnabled === 1,
      wa_bot_name: user.waBotName || 'Asistente Virtual',
      wa_bot_instructions: user.waBotInstructions || '',
      wa_bot_faq_json: user.waBotFaqJson || '[]',
      wa_bot_provider: user.waBotProvider || 'gemini',
      social_fb_cookie: user.socialFbCookie || '',
      social_ig_cookie: user.socialIgCookie || '',
    };

    if (user.smtpPass) {
      result.smtp_pass_set = 'true';
      result.smtp_pass = '********';
    } else {
      result.smtp_pass_set = 'false';
      result.smtp_pass = '';
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings — save current user's SMTP, company, AI & social settings
router.post('/', requireAuth as any, async (req: any, res: Response) => {
  try {
    const {
      company_name, company_website, sender_name,
      smtp_host, smtp_port, smtp_secure,
      smtp_user, smtp_pass, smtp_from,
      gemini_api_key, openai_api_key,
      ai_api_key, ai_model_name, ai_base_url,
      wa_bot_enabled, wa_bot_name, wa_bot_instructions,
      wa_bot_faq_json, wa_bot_provider,
      social_fb_cookie, social_ig_cookie,
    } = req.body;

    const fields: string[] = [];
    const values: any[] = [];

    if (company_name !== undefined) { fields.push('companyName = ?'); values.push(company_name); }
    if (company_website !== undefined) { fields.push('companyWebsite = ?'); values.push(company_website); }
    if (sender_name !== undefined) { fields.push('senderName = ?'); values.push(sender_name); }
    if (smtp_host !== undefined) { fields.push('smtpHost = ?'); values.push(smtp_host); }
    if (smtp_port !== undefined) { fields.push('smtpPort = ?'); values.push(smtp_port); }
    if (smtp_secure !== undefined) { fields.push('smtpSecure = ?'); values.push(smtp_secure); }
    if (smtp_user !== undefined) { fields.push('smtpUser = ?'); values.push(smtp_user); }
    if (smtp_pass !== undefined && smtp_pass !== '********') { fields.push('smtpPass = ?'); values.push(smtp_pass); }
    if (smtp_from !== undefined) { fields.push('smtpFrom = ?'); values.push(smtp_from); }

    // New AI & Social fields
    if (gemini_api_key !== undefined) { fields.push('geminiApiKey = ?'); values.push(gemini_api_key); }
    if (openai_api_key !== undefined) { fields.push('openaiApiKey = ?'); values.push(openai_api_key); }
    if (ai_api_key !== undefined) { fields.push('aiApiKey = ?'); values.push(ai_api_key); }
    if (ai_model_name !== undefined) { fields.push('aiModelName = ?'); values.push(ai_model_name); }
    if (ai_base_url !== undefined) { fields.push('aiBaseUrl = ?'); values.push(ai_base_url); }
    if (wa_bot_enabled !== undefined) { fields.push('waBotEnabled = ?'); values.push(wa_bot_enabled ? 1 : 0); }
    if (wa_bot_name !== undefined) { fields.push('waBotName = ?'); values.push(wa_bot_name); }
    if (wa_bot_instructions !== undefined) { fields.push('waBotInstructions = ?'); values.push(wa_bot_instructions); }
    if (wa_bot_faq_json !== undefined) { fields.push('waBotFaqJson = ?'); values.push(wa_bot_faq_json); }
    if (wa_bot_provider !== undefined) { fields.push('waBotProvider = ?'); values.push(wa_bot_provider); }
    if (social_fb_cookie !== undefined) { fields.push('socialFbCookie = ?'); values.push(social_fb_cookie); }
    if (social_ig_cookie !== undefined) { fields.push('socialIgCookie = ?'); values.push(social_ig_cookie); }

    if (fields.length > 0) {
      values.push(req.user.userId);
      await run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    res.json({ success: true, message: 'Configuración guardada correctamente.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/test-smtp — test SMTP for current user
router.post('/test-smtp', requireAuth as any, async (req: any, res: Response) => {
  try {
    const result = await testSmtpConnectionForUser(req.user.userId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/settings/send-email — send email via current user's SMTP
router.post('/send-email', requireAuth as any, async (req: any, res: Response) => {
  try {
    const { leadId, to, subject, html } = req.body;
    if (!to || !subject || !html) {
      res.status(400).json({ error: 'Destinatario (to), asunto y contenido HTML son requeridos.' });
      return;
    }

    let lead: any = {};
    if (leadId) {
      lead = (await get('SELECT * FROM leads WHERE id = ?', [leadId])) || {};
    }

    const result = await sendProspectEmailForUser({
      userId: req.user.userId,
      to, subject, html, lead,
    });

    if (leadId) {
      await run(
        "UPDATE leads SET status = 'CONTACTADO_EMAIL', updatedAt = ? WHERE id = ?",
        [new Date().toISOString(), leadId]
      );
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
