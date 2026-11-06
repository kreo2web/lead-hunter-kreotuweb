import axios from 'axios';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type AiProvider = 'gemini' | 'openai' | 'grok' | 'groq' | 'openrouter' | 'deepseek' | 'custom' | string;

export interface AiAgentConfig {
  provider: AiProvider;
  apiKey?: string;
  modelName?: string;
  baseUrl?: string;
  // Legacy / specific fields
  geminiApiKey?: string;
  openaiApiKey?: string;
  botName: string;
  companyName: string;
  companyWebsite: string;
  instructions: string;
  faqs: Array<{ question: string; answer: string }>;
  leadContext?: {
    name?: string;
    city?: string;
    category?: string;
  };
}

// Provider presets for OpenAI-compatible APIs
const PROVIDER_PRESETS: Record<string, { baseUrl: string; defaultModel: string }> = {
  grok: {
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-2-latest',
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
  },
  custom: {
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.3',
  },
};

export async function generateAiReply(
  history: ChatMessage[],
  incomingMessage: string,
  config: AiAgentConfig
): Promise<string> {
  const faqText = (config.faqs || [])
    .map((f, i) => `P${i + 1}: ${f.question}\nR${i + 1}: ${f.answer}`)
    .join('\n\n');

  const systemPrompt = `Eres ${config.botName || 'Asistente Virtual'}, el asistente de atención y ventas por WhatsApp de la empresa "${config.companyName || 'Kreotuweb'}".
Sitio web oficial: ${config.companyWebsite || 'No especificado'}

INFORMACIÓN Y DIRECTRICES DEL NEGOCIO:
${config.instructions || 'Atiende amablemente a prospectos y responde preguntas sobre nuestros servicios.'}

PREGUNTAS FRECUENTES Y RESPUESTAS AUTORIZADAS:
${faqText || 'No hay preguntas frecuentes registradas.'}

CONTEXTO DEL PROSPECTO AL QUE LE ESTÁS RESPONDIENDO:
- Nombre: ${config.leadContext?.name || 'Cliente / Prospecto'}
- Ciudad: ${config.leadContext?.city || 'No especificada'}
- Giro comercial: ${config.leadContext?.category || 'No especificado'}

REGLAS DE COMPORTAMIENTO Y VENTAS EN WHATSAPP:
1. Responde de forma cercana, concisa, profesional y natural (como una persona real en WhatsApp, evitando párrafos excesivamente largos).
2. Usa emojis de forma moderada para mantener un tono amigable.
3. POLÍTICA DE PRECIOS Y PLANES (VENTA CONSULTIVA Y CUALIFICACIÓN PREVIA):
   - NUNCA dispares de inmediato listas de precios, costos exactos ni nombres de planes en los primeros mensajes, incluso si el cliente pregunta directamente "¿Cuánto cuesta?", "¿Qué precio tiene?" o "¿Cuáles son sus planes?".
   - En su lugar, responde con empatía, valida su interés y hazle 1 sola pregunta breve de cualificación para entender su necesidad real.
     (Ejemplo: "¡Hola! Con gusto te paso la información. Para sugerirte la opción más adecuada y el presupuesto exacto, ¿actualmente ya cuentas con una página web o estás buscando iniciar un proyecto desde cero?").
   - ÚNICAMENTE debes revelar y detallar los precios y planes en última instancia, cuando se cumpla alguna de estas condiciones:
     a) El prospecto ya haya respondido a tus preguntas iniciales y esté cualificado (conociendo qué tipo de solución o necesidad tiene).
     b) El prospecto insista explícitamente por segunda vez consecutiva pidiendo las tarifas o precios.
   - Al presentar un precio o plan, enfócalo siempre en el valor que recibirá e inmediatamente invita al siguiente paso (como agendar una llamada breve de 10 minutos o enviarle una propuesta formal por correo o WhatsApp).
4. Si el prospecto hace preguntas generales o técnicas cuya respuesta esté en la sección de información o FAQs, respóndelas claramente.
5. Si te preguntan algo que NO sabes o que requiere un presupuesto personalizado no contemplado en tus datos, diles amablemente que tomarás nota para que un asesor especializado se comunique con ellos.
6. Tu objetivo principal es ayudar al prospecto, generar confianza, resolver sus inquietudes y guiarlo a una llamada o propuesta formal.
7. Responde SIEMPRE en español.`;

  const provider = config.provider || 'gemini';

  // 1. Google Gemini (Native API)
  if (provider === 'gemini') {
    const apiKey = config.apiKey || config.geminiApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('No se ha configurado la API Key de Google Gemini.');
    }
    const model = config.modelName?.trim() || 'gemini-1.5-flash';
    return callGemini(systemPrompt, history, incomingMessage, apiKey, model);
  }

  // 2. Universal OpenAI-compatible Gateway (Grok, Groq, OpenRouter, DeepSeek, OpenAI, Custom/Ollama)
  const preset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.custom;
  const baseUrl = config.baseUrl?.trim() || preset.baseUrl;
  const modelName = config.modelName?.trim() || preset.defaultModel;

  let apiKey = config.apiKey?.trim();
  if (!apiKey && provider === 'openai') {
    apiKey = config.openaiApiKey?.trim() || process.env.OPENAI_API_KEY;
  }

  // For custom/local endpoints (like local Ollama), API key may be optional
  if (!apiKey && provider !== 'custom') {
    throw new Error(`No se ha configurado la API Key para el proveedor "${provider}".`);
  }

  return callOpenAiCompatible({
    systemInstruction: systemPrompt,
    history,
    incomingMessage,
    apiKey: apiKey || '',
    baseUrl,
    modelName,
    provider,
  });
}

async function callGemini(
  systemInstruction: string,
  history: ChatMessage[],
  incomingMessage: string,
  apiKey: string,
  modelName: string = 'gemini-1.5-flash'
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${apiKey.trim()}`;

  const contents: any[] = [];

  for (const msg of history) {
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: incomingMessage }],
  });

  const payload = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 500,
    },
  };

  const res = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 25000,
  });

  const candidate = res.data?.candidates?.[0];
  const replyText = candidate?.content?.parts?.[0]?.text;

  if (!replyText) {
    throw new Error('La respuesta de Gemini no contiene texto válido.');
  }

  return replyText.trim();
}

async function callOpenAiCompatible(params: {
  systemInstruction: string;
  history: ChatMessage[];
  incomingMessage: string;
  apiKey: string;
  baseUrl: string;
  modelName: string;
  provider: string;
}): Promise<string> {
  const { systemInstruction, history, incomingMessage, apiKey, baseUrl, modelName, provider } = params;

  // Clean trailing slash
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const url = cleanBase.endsWith('/chat/completions') ? cleanBase : `${cleanBase}/chat/completions`;

  const messages: any[] = [{ role: 'system', content: systemInstruction }];

  for (const msg of history) {
    messages.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    });
  }

  messages.push({
    role: 'user',
    content: incomingMessage,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://kreotuweb.com';
    headers['X-Title'] = 'Lead Hunter Kreotuweb';
  }

  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await axios.post(
        url,
        {
          model: modelName,
          messages,
          temperature: 0.7,
          max_tokens: 600,
        },
        {
          headers,
          timeout: 30000,
        }
      );

      const replyText = res.data?.choices?.[0]?.message?.content;

      if (!replyText) {
        throw new Error(`La respuesta de ${provider} (${modelName}) no contiene texto válido.`);
      }

      return replyText.trim();
    } catch (err: any) {
      lastError = err;
      const status = err.response?.status;

      // Manejar Rate Limit (429) o fallos temporales (500, 502, 503, 504) con reintentos
      if ((status === 429 || status === 500 || status === 502 || status === 503 || status === 504) && attempt < maxRetries) {
        const retryAfterHeader = err.response?.headers?.['retry-after'];
        let waitMs = (attempt + 1) * 2000; // 2s, 4s, 6s

        if (retryAfterHeader) {
          const parsed = parseFloat(retryAfterHeader);
          if (!isNaN(parsed)) {
            waitMs = Math.ceil(parsed * 1000) + 500;
          }
        }

        console.warn(`⚠️ [${provider}] Error HTTP ${status}. Reintentando solicitud (${attempt + 1}/${maxRetries}) tras esperar ${waitMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      break;
    }
  }

  throw lastError;
}
