import axios from 'axios';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiAgentConfig {
  provider: 'gemini' | 'openai';
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

  if (config.provider === 'openai' && config.openaiApiKey) {
    return callOpenAi(systemPrompt, history, incomingMessage, config.openaiApiKey);
  }

  // Default: Google Gemini
  const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('No se ha configurado la API Key de Google Gemini ni de OpenAI.');
  }

  return callGemini(systemPrompt, history, incomingMessage, apiKey);
}

async function callGemini(
  systemInstruction: string,
  history: ChatMessage[],
  incomingMessage: string,
  apiKey: string
): Promise<string> {
  // Use gemini-1.5-flash or gemini-2.5-flash
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;

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
    timeout: 20000,
  });

  const candidate = res.data?.candidates?.[0];
  const replyText = candidate?.content?.parts?.[0]?.text;

  if (!replyText) {
    throw new Error('La respuesta de Gemini no contiene texto válido.');
  }

  return replyText.trim();
}

async function callOpenAi(
  systemInstruction: string,
  history: ChatMessage[],
  incomingMessage: string,
  apiKey: string
): Promise<string> {
  const url = 'https://api.openai.com/v1/chat/completions';

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

  const res = await axios.post(
    url,
    {
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      timeout: 20000,
    }
  );

  const replyText = res.data?.choices?.[0]?.message?.content;
  if (!replyText) {
    throw new Error('OpenAI no devolvió una respuesta válida.');
  }

  return replyText.trim();
}
