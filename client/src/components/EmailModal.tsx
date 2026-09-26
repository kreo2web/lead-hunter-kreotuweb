import React, { useState, useEffect } from 'react';
import { Lead, Template } from '../types';
import { X, Mail, Send, Eye, Code, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface EmailModalProps {
  lead: Lead | null;
  templates: Template[];
  onClose: () => void;
  onSent: (leadId: string) => void;
}

export const EmailModal: React.FC<EmailModalProps> = ({
  lead,
  templates,
  onClose,
  onSent,
}) => {
  if (!lead) return null;

  const emailTemplates = templates.filter((t) => t.type === 'EMAIL');

  const getInitialTemplateId = () => {
    const matching = emailTemplates.find((t) => t.targetRanking === lead.rankingLevel);
    if (matching) return matching.id;
    const defaultTemplate = emailTemplates.find((t) => t.isDefault);
    return defaultTemplate ? defaultTemplate.id : emailTemplates[0]?.id || '';
  };

  const [selectedTemplateId, setSelectedTemplateId] = useState(getInitialTemplateId());
  const [recipientEmail, setRecipientEmail] = useState(lead.email || '');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success?: boolean; message?: string } | null>(null);

  // Substitute lead variables (company vars are substituted server-side on send)
  const renderText = (rawText: string) => {
    if (!rawText) return '';
    return rawText
      .replace(/{nombre_negocio}/g, lead.name || '')
      .replace(/{telefono}/g, lead.phone || '')
      .replace(/{telefono_limpio}/g, lead.cleanPhone || '')
      .replace(/{sitio_web}/g, lead.website || 'No registrado')
      .replace(/{ciudad}/g, lead.city || 'su ciudad')
      .replace(/{direccion}/g, lead.address || '')
      .replace(/{rubro}/g, lead.category || 'su sector comercial')
      .replace(/{calificacion}/g, lead.rating ? `${lead.rating} ⭐` : '')
      .replace(/{diagnostico_web}/g, lead.websiteAuditNotes || 'Sin observaciones');
    // {mi_empresa}, {mi_web}, {nombre_remitente} are replaced server-side using your SMTP settings
  };

  useEffect(() => {
    const template = emailTemplates.find((t) => t.id === selectedTemplateId);
    if (template) {
      setSubject(renderText(template.subject || 'Propuesta de Kreotuweb.com'));
      setHtmlContent(renderText(template.content));
    }
  }, [selectedTemplateId, lead]);

  const insertVariable = (varName: string) => {
    setHtmlContent((prev) => prev + ` {${varName}}`);
  };

  const handleSendEmail = async () => {
    if (!recipientEmail.trim()) {
      alert('Por favor introduce un correo electrónico de destino.');
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const res = await fetch('/api/email/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('lead_hunter_token') || ''}`,
        },
        body: JSON.stringify({
          leadId: lead.id,
          to: recipientEmail.trim(),
          subject: subject.trim(),
          html: htmlContent,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSendResult({ success: true, message: '¡Correo enviado exitosamente vía SMTP!' });
        onSent(lead.id);
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setSendResult({
          success: false,
          message: data.error || data.message || 'Error al enviar el correo. Revisa tus credenciales SMTP.',
        });
      }
    } catch (err: any) {
      setSendResult({ success: false, message: `Error de red: ${err.message}` });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-sky-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Enviar Correo SMTP a {lead.name}</h3>
              <p className="text-xs text-sky-100">Editor HTML personalizable según tu sistema de diseño</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Top form controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Template select */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Plantilla de Correo
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              >
                {emailTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Objetivo: {t.targetRanking})
                  </option>
                ))}
              </select>
            </div>

            {/* Recipient Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Destinatario (Email)
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>
          </div>

          {/* Subject line */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Asunto del Correo
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Asunto llamativo..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          {/* Variables bar */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Variables:
            </span>
            {['nombre_negocio', 'ciudad', 'rubro', 'sitio_web', 'diagnostico_web', 'mi_empresa', 'mi_web'].map(
              (v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(v)}
                  className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono transition-colors cursor-pointer"
                >
                  {`{${v}}`}
                </button>
              )
            )}
          </div>

          {/* Editor Mode Tabs */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 flex items-center justify-between border-b border-slate-200">
              <span className="text-xs font-semibold text-slate-600">Diseño del Email:</span>
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'preview'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Vista Previa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'code'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Editor HTML</span>
                </button>
              </div>
            </div>

            {/* Tab content */}
            <div className="p-0">
              {activeTab === 'preview' ? (
                <div className="p-4 bg-slate-100 min-h-[300px] max-h-[400px] overflow-y-auto">
                  <div
                    className="bg-white rounded-xl shadow-xs overflow-hidden mx-auto max-w-[650px]"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                </div>
              ) : (
                <textarea
                  rows={14}
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  className="w-full p-4 font-mono text-xs bg-slate-900 text-sky-300 focus:outline-none focus:ring-0 leading-relaxed"
                  spellCheck={false}
                />
              )}
            </div>
          </div>

          {/* Feedback alerts */}
          {sendResult && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium ${
                sendResult.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {sendResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{sendResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={handleSendEmail}
            disabled={isSending || !recipientEmail.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-md shadow-sky-600/20 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando vía SMTP...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enviar Correo vía SMTP</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
