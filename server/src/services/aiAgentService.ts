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

REGLAS DE COMPORTAMIENTO EN WHATSAPP:
1. Responde de forma cercana, concisa, profesional y natural (como una persona real en WhatsApp, evitando párrafos excesivamente largos).
2. Usa emojis de forma moderada para mantener un tono amigable.
3. Si el prospecto hace una pregunta cuya respuesta esté en la sección de información o FAQs, respóndela claramente.
4. Si te preguntan algo que NO sabes o que requiere un presupuesto exacto no definido, diles amablemente que tomarás nota para que un asesor especializado se comunique con ellos.
5. Tu objetivo es ayudar al prospecto, resolver sus inquietudes y animarlo a dar el siguiente paso (por ejemplo agendar una llamada breve, pedir su correo electrónico o coordinar una propuesta).
6. Responde SIEMPRE en español.`;

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
}
