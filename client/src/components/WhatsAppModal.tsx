import React, { useState, useEffect } from 'react';
import { Lead, Template } from '../types';
import { X, MessageCircle, Send, Copy, Check, ExternalLink } from 'lucide-react';

interface WhatsAppModalProps {
  lead: Lead | null;
  templates: Template[];
  onClose: () => void;
  onSent: (leadId: string) => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  lead,
  templates,
  onClose,
  onSent,
}) => {
  if (!lead) return null;

  const waTemplates = templates.filter((t) => t.type === 'WHATSAPP');

  // Find best matching template according to ranking
  const getInitialTemplateId = () => {
    const matching = waTemplates.find((t) => t.targetRanking === lead.rankingLevel);
    if (matching) return matching.id;
    const defaultTemplate = waTemplates.find((t) => t.isDefault);
    return defaultTemplate ? defaultTemplate.id : waTemplates[0]?.id || '';
  };

  const [selectedTemplateId, setSelectedTemplateId] = useState(getInitialTemplateId());
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Substitute variables
  const renderMessage = (rawText: string) => {
    if (!rawText) return '';
    return rawText
      .replace(/{nombre_negocio}/g, lead.name || '')
      .replace(/{telefono}/g, lead.phone || '')
      .replace(/{telefono_limpio}/g, lead.cleanPhone || '')
      .replace(/{sitio_web}/g, lead.website || 'No registrado')
      .replace(/{ciudad}/g, lead.city || 'su ciudad')
      .replace(/{direccion}/g, lead.address || '')
      .replace(/{rubro}/g, lead.category || 'su sector')
      .replace(/{calificacion}/g, lead.rating ? `${lead.rating} ⭐` : '')
      .replace(/{diagnostico_web}/g, lead.websiteAuditNotes || 'Sin observaciones')
      .replace(/{mi_empresa}/g, 'Kreotuweb.com')
      .replace(/{mi_web}/g, 'https://kreotuweb.com')
      .replace(/{nombre_remitente}/g, 'Equipo Kreotuweb');
  };

  useEffect(() => {
    const template = waTemplates.find((t) => t.id === selectedTemplateId);
    if (template) {
      setCustomMessage(renderMessage(template.content));
    }
  }, [selectedTemplateId, lead]);

  const handleSend = () => {
    if (!lead.cleanPhone) {
      alert('Este prospecto no tiene un número de teléfono válido.');
      return;
    }
    const encoded = encodeURIComponent(customMessage);
    const url = `https://wa.me/${lead.cleanPhone}?text=${encoded}`;
    window.open(url, '_blank');
    onSent(lead.id);
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const insertVariable = (varName: string) => {
    setCustomMessage((prev) => prev + ` {${varName}}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <MessageCircle className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-bold">Enviar WhatsApp a {lead.name}</h3>
              <p className="text-xs text-emerald-100">
                Teléfono: <span className="font-mono font-semibold">{lead.phone || lead.cleanPhone}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Template selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Seleccionar Plantilla de Mensaje
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              {waTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Ranking objetivo: {t.targetRanking})
                </option>
              ))}
            </select>
          </div>

          {/* Quick variable tags */}
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Variables disponibles (clic para insertar):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {['nombre_negocio', 'ciudad', 'rubro', 'sitio_web', 'diagnostico_web', 'mi_empresa'].map(
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
          </div>

          {/* Editable text area */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Mensaje personalizado (puedes editarlo libremente antes de enviar):
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar texto'}</span>
              </button>
            </div>
            <textarea
              rows={8}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-sans leading-relaxed"
            />
          </div>

          {/* Opportunity highlight */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
            <span className="font-bold">Prioridad:</span>
            <span>
              {lead.rankingLevel === 'ALTO'
                ? '🟢 Sin sitio web registrado. Máxima oportunidad para vender diseño web desde cero.'
                : lead.rankingLevel === 'MEDIO'
                ? '🟡 Sitio web antiguo o con problemas técnicos. Ideal para propuesta de rediseño web.'
                : '⚪ Sitio web activo. Ideal para ofrecer SEO y campañas de captación.'}
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={!lead.cleanPhone}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:cursor-not-allowed"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Abrir en WhatsApp (1-Click)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
