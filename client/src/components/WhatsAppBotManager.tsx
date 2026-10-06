import React, { useState, useEffect } from 'react';
import {
  Bot,
  QrCode,
  Smartphone,
  RefreshCw,
  Power,
  PowerOff,
  Sparkles,
  Save,
  Plus,
  Trash2,
  Send,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Key,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
  User,
} from 'lucide-react';
import { Settings, WaChat } from '../types';

interface WhatsAppBotManagerProps {
  authToken: string;
  settings: Settings;
  onUpdateSettings: (newSettings: Partial<Settings>) => Promise<void>;
}

export const WhatsAppBotManager: React.FC<WhatsAppBotManagerProps> = ({
  authToken,
  settings,
  onUpdateSettings,
}) => {
  // Connection state
  const [waStatus, setWaStatus] = useState<{
    isConnected: boolean;
    qrDataUrl: string | null;
    userPhone: string | null;
    isConnecting: boolean;
    lastError: string | null;
  }>({
    isConnected: false,
    qrDataUrl: null,
    userPhone: null,
    isConnecting: false,
    lastError: null,
  });

  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form training state
  const [botEnabled, setBotEnabled] = useState(settings.wa_bot_enabled || false);
  const [botName, setBotName] = useState(settings.wa_bot_name || 'Asistente Virtual');
  const [botProvider, setBotProvider] = useState<string>(settings.wa_bot_provider || 'gemini');
  const [geminiApiKey, setGeminiApiKey] = useState(settings.gemini_api_key || '');
  const [openaiApiKey, setOpenaiApiKey] = useState(settings.openai_api_key || '');
  const [aiApiKey, setAiApiKey] = useState(settings.ai_api_key || '');
  const [aiModelName, setAiModelName] = useState(settings.ai_model_name || '');
  const [aiBaseUrl, setAiBaseUrl] = useState(settings.ai_base_url || '');
  const [botInstructions, setBotInstructions] = useState(settings.wa_bot_instructions || '');

  // FAQs state
  const [faqs, setFaqs] = useState<Array<{ question: string; answer: string }>>(() => {
    try {
      if (settings.wa_bot_faq_json) {
        return JSON.parse(settings.wa_bot_faq_json);
      }
    } catch {}
    return [
      {
        question: '¿Cuánto cuesta una página web?',
        answer: 'Nuestros paquetes inician desde planes básicos para emprendedores hasta proyectos a medida. ¿Te gustaría que agendemos una llamada rápida de 10 minutos para darte una cotización exacta según lo que necesitas?',
      },
      {
        question: '¿Qué incluye el diseño web?',
        answer: 'Incluye diseño adaptado a celulares, optimización SEO para salir en Google, botones directos a WhatsApp, certificado SSL de seguridad y correos corporativos.',
      },
    ];
  });

  // Simulator state
  const [testMessage, setTestMessage] = useState('');
  const [testReply, setTestReply] = useState('');
  const [isTestingAi, setIsTestingAi] = useState(false);

  useEffect(() => {
    if (settings.wa_bot_enabled !== undefined) setBotEnabled(settings.wa_bot_enabled);
    if (settings.wa_bot_name) setBotName(settings.wa_bot_name);
    if (settings.wa_bot_provider) setBotProvider(settings.wa_bot_provider);
    if (settings.gemini_api_key !== undefined) setGeminiApiKey(settings.gemini_api_key);
    if (settings.openai_api_key !== undefined) setOpenaiApiKey(settings.openai_api_key);
    if (settings.ai_api_key !== undefined) setAiApiKey(settings.ai_api_key);
    if (settings.ai_model_name !== undefined) setAiModelName(settings.ai_model_name);
    if (settings.ai_base_url !== undefined) setAiBaseUrl(settings.ai_base_url);
    if (settings.wa_bot_instructions !== undefined) setBotInstructions(settings.wa_bot_instructions);
    if (settings.wa_bot_faq_json) {
      try {
        setFaqs(JSON.parse(settings.wa_bot_faq_json));
      } catch {}
    }
  }, [settings]);

  // Chats list state
  const [chats, setChats] = useState<WaChat[]>([]);
  const [activeTab, setActiveTab] = useState<'bot' | 'chats'>('bot');

  // Fetch WA Status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/status', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWaStatus({
          isConnected: data.isConnected,
          qrDataUrl: data.qrDataUrl,
          userPhone: data.userPhone,
          isConnecting: data.isConnecting,
          lastError: data.lastError,
        });
      }
    } catch (err) {
      console.error('Error fetching WA status:', err);
    }
  };

  // Fetch Chats
  const fetchChats = async () => {
    try {
      const res = await fetch('/api/whatsapp/chats', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChats(data.chats || []);
      }
    } catch (err) {
      console.error('Error fetching WA chats:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchChats();
    const interval = setInterval(() => {
      fetchStatus();
    }, 4000);
    return () => clearInterval(interval);
  }, [authToken]);

  // Connect WhatsApp
  const handleConnect = async () => {
    setIsLoadingStatus(true);
    try {
      await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      fetchStatus();
    } catch (err) {
      console.error('Error connecting WA:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Disconnect WhatsApp
  const handleDisconnect = async () => {
    if (!confirm('¿Deseas desconectar tu WhatsApp?')) return;
    setIsLoadingStatus(true);
    try {
      await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      fetchStatus();
    } catch (err) {
      console.error('Error disconnecting WA:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Toggle Bot per chat
  const handleToggleChatBot = async (chatId: string) => {
    try {
      const res = await fetch(`/api/whatsapp/chats/${chatId}/toggle-bot`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        fetchChats();
      }
    } catch (err) {
      console.error('Error toggling bot for chat:', err);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await onUpdateSettings({
        wa_bot_enabled: botEnabled,
        wa_bot_name: botName.trim(),
        wa_bot_provider: botProvider,
        gemini_api_key: geminiApiKey.trim(),
        openai_api_key: openaiApiKey.trim(),
        ai_api_key: aiApiKey.trim(),
        ai_model_name: aiModelName.trim(),
        ai_base_url: aiBaseUrl.trim(),
        wa_bot_instructions: botInstructions.trim(),
        wa_bot_faq_json: JSON.stringify(faqs),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Error guardando configuración');
    } finally {
      setIsSaving(false);
    }
  };

  // Test Simulator
  const handleRunAiTest = async () => {
    if (!testMessage.trim()) return;
    setIsTestingAi(true);
    setTestReply('');

    const effectiveApiKey =
      botProvider === 'gemini'
        ? (geminiApiKey || aiApiKey)
        : botProvider === 'openai'
        ? (openaiApiKey || aiApiKey)
        : aiApiKey;

    try {
      const res = await fetch('/api/whatsapp/test-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          message: testMessage.trim(),
          instructions: botInstructions,
          faqs,
          botName,
          provider: botProvider,
          apiKey: effectiveApiKey,
          modelName: aiModelName.trim(),
          baseUrl: aiBaseUrl.trim(),
          geminiApiKey,
          openaiApiKey,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestReply(data.reply);
      } else {
        setTestReply(`Error: ${data.error || 'No se pudo generar respuesta'}`);
      }
    } catch (err: any) {
      setTestReply(`Error de conexión: ${err.message}`);
    } finally {
      setIsTestingAi(false);
    }
  };

  // FAQ management
  const addFaq = () => {
    setFaqs([...faqs, { question: '', answer: '' }]);
  };

  const removeFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...faqs];
    updated[index][field] = value;
    setFaqs(updated);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold mb-3">
            <Bot className="w-4 h-4 text-emerald-200" />
            <span>Atención & Seguimiento Automático</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Robot de WhatsApp con Inteligencia Artificial
          </h1>
          <p className="mt-2 text-sm sm:text-base text-emerald-50 leading-relaxed">
            Conecta tu WhatsApp mediante código QR (sin API oficial ni costos por mensaje) y deja que tu robot entrenado con la información de tu negocio atienda y dé seguimiento a tus prospectos al instante.
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('bot')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'bot'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Configuración & Entrenamiento IA</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('chats');
            fetchChats();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'chats'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Conversaciones de Prospectos ({chats.length})</span>
        </button>
      </div>

      {activeTab === 'bot' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: WhatsApp Connection & QR */}
          <div className="lg:col-span-5 space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Estado de WhatsApp</h3>
                    <p className="text-xs text-slate-500">Conexión directa vía WhatsApp Web</p>
                  </div>
                </div>

                {waStatus.isConnected ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Conectado
                  </span>
                ) : waStatus.isConnecting ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Vinculando...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                    <PowerOff className="w-3.5 h-3.5" />
                    Desconectado
                  </span>
                )}
              </div>

              {/* Connected view */}
              {waStatus.isConnected ? (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-emerald-800 font-semibold">Número Vinculado:</p>
                      <p className="text-base font-bold text-emerald-950 font-mono">
                        +{waStatus.userPhone}
                      </p>
                    </div>
                    <button
                      onClick={handleDisconnect}
                      disabled={isLoadingStatus}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 transition-colors"
                    >
                      Desconectar
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-700 leading-relaxed">
                    Tu WhatsApp está activo. Las respuestas generadas por el robot se enviarán desde este número en tiempo real cuando un prospecto responda.
                  </p>
                </div>
              ) : (
                /* QR view */
                <div className="space-y-4">
                  {waStatus.qrDataUrl ? (
                    <div className="text-center p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <p className="text-xs font-semibold text-slate-700">
                        Escanea este código QR desde tu WhatsApp:
                      </p>
                      <div className="inline-block p-3 bg-white rounded-xl shadow-xs border border-slate-200">
                        <img
                          src={waStatus.qrDataUrl}
                          alt="WhatsApp QR Code"
                          className="w-56 h-56 mx-auto rounded-lg"
                        />
                      </div>
                      <div className="text-left text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-100 space-y-1">
                        <p className="font-semibold text-slate-800">Pasos para conectar:</p>
                        <ol className="list-decimal list-inside space-y-0.5 text-slate-500">
                          <li>Abre WhatsApp en tu teléfono.</li>
                          <li>Ve a <strong>Ajustes</strong> o <strong>Menú (⋮)</strong> &gt; <strong>Dispositivos vinculados</strong>.</li>
                          <li>Toca <strong>Vincular un dispositivo</strong> y apunta tu cámara al QR.</li>
                        </ol>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 px-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <QrCode className="w-12 h-12 text-slate-400 mx-auto" />
                      <div>
                        <p className="text-sm font-semibold text-slate-700">No hay sesión activa</p>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto">
                          Haz clic en conectar para generar el código QR de vinculación instantánea.
                        </p>
                      </div>
                      <button
                        onClick={handleConnect}
                        disabled={isLoadingStatus}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                      >
                        <Power className="w-4 h-4" />
                        <span>Generar Código QR</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Simulator Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900">Simulador de Pruebas IA</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hazle una pregunta de prueba a tu robot para comprobar cómo respondería con el entrenamiento actual antes de interactuar con prospectos reales.
              </p>

              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Ej: ¿Qué servicios ofrecen y cuánto tardan?"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleRunAiTest()}
                  />
                  <button
                    type="button"
                    onClick={handleRunAiTest}
                    disabled={isTestingAi || !testMessage.trim()}
                    className="absolute right-1.5 top-1.5 p-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isTestingAi && (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>El robot está pensando la respuesta...</span>
                  </div>
                )}

                {testReply && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                      <Bot className="w-3.5 h-3.5" />
                      <span>Respuesta de {botName}:</span>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line bg-white p-3 rounded-lg border border-slate-100 shadow-2xs font-sans">
                      {testReply}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Training & Knowledge Base */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Entrenamiento del Asistente</h3>
                  <p className="text-xs text-slate-500">Define la identidad, conocimientos y reglas de tu robot</p>
                </div>

                {/* Master Switch */}
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <span className="text-xs font-semibold text-slate-700">Robot Activo:</span>
                  <div className="relative inline-block w-11 h-6">
                    <input
                      type="checkbox"
                      checked={botEnabled}
                      onChange={(e) => setBotEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </div>
                </label>
              </div>

              {/* Bot Identity & Model Provider */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre del Asistente
                  </label>
                  <input
                    type="text"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    placeholder="Ej: Sofía de Kreotuweb"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Motor de Inteligencia Artificial
                  </label>
                  <select
                    value={botProvider}
                    onChange={(e) => setBotProvider(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="gemini">Google Gemini (Flash - Rápido y Gratis)</option>
                    <option value="groq">Groq Cloud (Llama 3.3 70B - ¡100% Gratis y Ultra Rápido!)</option>
                    <option value="openrouter">OpenRouter (Modelos Free como DeepSeek R1 & Llama 3)</option>
                    <option value="grok">xAI Grok (Grok 2 / Grok Beta)</option>
                    <option value="deepseek">DeepSeek (V3 / R1 - Económico y Capaz)</option>
                    <option value="openai">OpenAI (GPT-4o mini)</option>
                    <option value="custom">Personalizado / Ollama / Endpoint Local OpenAI</option>
                  </select>
                </div>
              </div>

              {/* API Keys & Model Parameters */}
              <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <Key className="w-4 h-4 text-emerald-600" />
                  <span>Configuración del Proveedor ({botProvider.toUpperCase()})</span>
                </div>

                {/* API Key Field */}
                {botProvider === 'gemini' && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Google Gemini API Key:
                    </label>
                    <input
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      ¿No tienes una clave? Puedes obtenerla de forma gratuita en{' '}
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:underline font-semibold"
                      >
                        Google AI Studio
                      </a>.
                    </p>
                  </div>
                )}

                {botProvider === 'groq' && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Groq Cloud API Key (Gratis):
                    </label>
                    <input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="gsk_..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Consigue tu API Key gratuita (sin tarjeta) en{' '}
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:underline font-semibold"
                      >
                        Groq Console
                      </a>. Ofrece respuestas casi instantáneas con Llama 3.3.
                    </p>
                  </div>
                )}

                {botProvider === 'openrouter' && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      OpenRouter API Key:
                    </label>
                    <input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Consigue tu clave en{' '}
                      <a
                        href="https://openrouter.ai/keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:underline font-semibold"
                      >
                        OpenRouter
                      </a>. Puedes usar modelos libres agregando el sufijo <code className="bg-slate-200 px-1 rounded text-slate-800 font-mono">:free</code>.
                    </p>
                  </div>
                )}

                {botProvider === 'grok' && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      xAI Grok API Key:
                    </label>
                    <input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="xai-..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Consigue tu clave de xAI en{' '}
                      <a
                        href="https://console.x.ai/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:underline font-semibold"
                      >
                        xAI Console
                      </a>.
                    </p>
                  </div>
                )}

                {botProvider === 'deepseek' && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      DeepSeek API Key:
                    </label>
                    <input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Consigue tu clave de DeepSeek en{' '}
                      <a
                        href="https://platform.deepseek.com/api_keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:underline font-semibold"
                      >
                        DeepSeek Platform
                      </a>.
                    </p>
                  </div>
                )}

                {botProvider === 'openai' && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      OpenAI API Key:
                    </label>
                    <input
                      type="password"
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Consigue tu clave en{' '}
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:underline font-semibold"
                      >
                        OpenAI Platform
                      </a>.
                    </p>
                  </div>
                )}

                {botProvider === 'custom' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        URL Base de la API (Endpoint OpenAI Compatible):
                      </label>
                      <input
                        type="text"
                        value={aiBaseUrl}
                        onChange={(e) => setAiBaseUrl(e.target.value)}
                        placeholder="http://localhost:11434/v1"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Ejemplo para Ollama: <code className="bg-slate-200 px-1 rounded text-slate-800 font-mono">http://localhost:11434/v1</code> o tu servidor proxy.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        API Key / Bearer Token (Opcional si es local):
                      </label>
                      <input
                        type="password"
                        value={aiApiKey}
                        onChange={(e) => setAiApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {/* Optional Model Override */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Modelo Específico (Opcional):
                  </label>
                  <input
                    type="text"
                    value={aiModelName}
                    onChange={(e) => setAiModelName(e.target.value)}
                    placeholder={
                      botProvider === 'gemini'
                        ? 'gemini-1.5-flash (por defecto)'
                        : botProvider === 'groq'
                        ? 'llama-3.3-70b-versatile (por defecto)'
                        : botProvider === 'openrouter'
                        ? 'meta-llama/llama-3.3-70b-instruct:free (por defecto)'
                        : botProvider === 'grok'
                        ? 'grok-2-latest (por defecto)'
                        : botProvider === 'deepseek'
                        ? 'deepseek-chat (por defecto)'
                        : botProvider === 'openai'
                        ? 'gpt-4o-mini (por defecto)'
                        : 'llama3.3 (o el modelo cargado en tu endpoint)'
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Deja vacío para usar el modelo recomendado, o ingresa el ID del modelo que prefieras.
                  </p>
                </div>
              </div>

              {/* Business Description & Instructions */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Información y Servicios de Tu Negocio (Contexto para la IA)
                </label>
                <textarea
                  rows={4}
                  value={botInstructions}
                  onChange={(e) => setBotInstructions(e.target.value)}
                  placeholder="Describe qué hace tu empresa, tus servicios principales, tiempos de entrega, ofertas y el objetivo de la conversación (ej: invitar a agendar videollamada o solicitar correo para enviar propuesta)."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 leading-relaxed"
                />
              </div>

              {/* FAQs section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <HelpCircle className="w-4 h-4 text-emerald-600" />
                    <span>Preguntas Frecuentes y Respuestas Autorizadas</span>
                  </div>
                  <button
                    type="button"
                    onClick={addFaq}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Pregunta</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {faqs.map((faq, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative group"
                    >
                      <button
                        type="button"
                        onClick={() => removeFaq(idx)}
                        className="absolute right-2 top-2 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Eliminar pregunta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div>
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => updateFaq(idx, 'question', e.target.value)}
                          placeholder="Pregunta (ej: ¿Cuáles son las formas de pago?)"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <textarea
                          rows={2}
                          value={faq.answer}
                          onChange={(e) => updateFaq(idx, 'answer', e.target.value)}
                          placeholder="Respuesta exacta que debe dar el robot..."
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedback and Submit Button */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                {saveSuccess ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>¡Entrenamiento y configuración guardados!</span>
                  </div>
                ) : (
                  <div />
                )}

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Guardando...' : 'Guardar Entrenamiento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* Chats List Tab */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Conversaciones de WhatsApp</h3>
              <p className="text-xs text-slate-500">Historial y control individual del robot por cada prospecto</p>
            </div>
            <button
              onClick={fetchChats}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Actualizar</span>
            </button>
          </div>

          {chats.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-500 space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold">No hay conversaciones registradas aún</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Cuando tus prospectos te respondan en WhatsApp tras el primer mensaje, sus conversaciones aparecerán aquí automáticamente y el robot les dará seguimiento.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {chats.map((c) => (
                <div key={c.id} className="p-4 sm:p-5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {c.leadName || `+${c.phone}`}
                        </span>
                        {c.rankingLevel && (
                          <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                            c.rankingLevel === 'ALTO'
                              ? 'bg-rose-100 text-rose-700'
                              : c.rankingLevel === 'MEDIO'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {c.rankingLevel}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono">+{c.phone}</p>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-1 italic">
                        "{c.lastMessage}"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {c.lastMessageAt && (
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}

                    <button
                      onClick={() => handleToggleChatBot(c.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        c.botActive === 1
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {c.botActive === 1 ? (
                        <>
                          <PauseCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Robot Activo</span>
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-3.5 h-3.5 text-slate-500" />
                          <span>Robot Pausado</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
