import React, { useState, useEffect } from 'react';
import { Lead, Template, PhoneOption } from '../types';
import { X, Smartphone, Send, Copy, Check, ExternalLink, MessageSquare, Info } from 'lucide-react';
import { getLeadPhoneOptions } from '../utils/phoneUtils';

interface SmsModalProps {
  lead: Lead | null;
  templates: Template[];
  onClose: () => void;
  onSent: (leadId: string) => void;
}

export const SmsModal: React.FC<SmsModalProps> = ({
  lead,
  templates,
  onClose,
  onSent,
}) => {
  if (!lead) return null;

  const smsTemplates = templates.filter((t) => t.type === 'SMS');
  const phoneOptions = getLeadPhoneOptions(lead);

  // Selected phone number
  const [selectedPhone, setSelectedPhone] = useState<PhoneOption>(() => {
    const defaultOption = phoneOptions.find((p) => p.isDefault);
    return defaultOption || phoneOptions[0] || {
      phone: lead.phone || '',
      cleanPhone: lead.cleanPhone || '',
      source: 'Principal',
      isDefault: true,
    };
  });

  // Find initial template matching ranking
  const getInitialTemplateId = () => {
    const matching = smsTemplates.find((t) => t.targetRanking === lead.rankingLevel);
    if (matching) return matching.id;
    const defaultTemplate = smsTemplates.find((t) => t.isDefault);
    return defaultTemplate ? defaultTemplate.id : smsTemplates[0]?.id || '';
  };

  const [selectedTemplateId, setSelectedTemplateId] = useState(getInitialTemplateId());
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Substitute variables
  const renderMessage = (rawText: string) => {
    if (!rawText) return '';
    return rawText
      .replace(/{nombre_negocio}/g, lead.name || '')
      .replace(/{telefono}/g, selectedPhone.phone || lead.phone || '')
      .replace(/{telefono_limpio}/g, selectedPhone.cleanPhone || lead.cleanPhone || '')
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
    const template = smsTemplates.find((t) => t.id === selectedTemplateId);
    if (template) {
      setCustomMessage(renderMessage(template.content));
    } else if (smsTemplates.length === 0) {
      setCustomMessage(
        renderMessage(
          `Hola {nombre_negocio}, vi su negocio en Google Maps en {ciudad}. En {mi_empresa} creamos páginas web modernas para captar clientes reales. ¿Le gustaría ver una propuesta rápida sin compromiso? Info: {mi_web}`
        )
      );
    }
  }, [selectedTemplateId, lead, selectedPhone]);

  const handleSendSms = () => {
    const targetNumber = selectedPhone.cleanPhone || selectedPhone.phone;
    if (!targetNumber) {
      alert('Este prospecto no tiene un número de teléfono válido.');
      return;
    }

    const encoded = encodeURIComponent(customMessage);
    // Standard RFC 5724 URI that Windows Phone Link (Enlace Móvil) listens to
    const smsUri = `sms:${targetNumber}?body=${encoded}`;

    // Open in Windows Phone Link / default SMS client
    window.location.href = smsUri;
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

  const smsPartsCount = Math.max(1, Math.ceil(customMessage.length / 160));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">Enviar Mensaje SMS a {lead.name}</h3>
              <p className="text-xs text-indigo-100 flex items-center gap-1.5 mt-0.5">
                <span>Vinculado con <strong>Windows Phone Link</strong> (Enlace Móvil)</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Phone Selector if multiple available */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Número de Teléfono para SMS:
              </label>
              <span className="text-[11px] text-slate-500">
                {phoneOptions.length > 1
                  ? `${phoneOptions.length} números encontrados`
                  : '1 número disponible'}
              </span>
            </div>

            {phoneOptions.length > 1 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {phoneOptions.map((opt, idx) => {
                  const isSelected = selectedPhone.cleanPhone === opt.cleanPhone;
                  return (
                    <button
                      key={`${opt.cleanPhone}_${idx}`}
                      type="button"
                      onClick={() => setSelectedPhone(opt)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 ring-2 ring-indigo-500/20'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <span className="font-semibold block">{opt.source}</span>
                        <span className="font-mono text-slate-600">{opt.phone}</span>
                      </div>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                          Activo
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-900 bg-white p-2.5 rounded-lg border border-slate-200">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span>{selectedPhone.phone || 'Sin teléfono disponible'}</span>
                <span className="text-[11px] font-sans font-normal text-slate-500">
                  ({selectedPhone.source || 'Principal'})
                </span>
              </div>
            )}
          </div>

          {/* Template Selector */}
          {smsTemplates.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Seleccionar Plantilla SMS
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {smsTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Ranking: {t.targetRanking})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Texto del Mensaje SMS
              </label>
              <span
                className={`text-[11px] font-mono ${
                  customMessage.length > 160 ? 'text-amber-600 font-bold' : 'text-slate-400'
                }`}
              >
                {customMessage.length} caracteres ({smsPartsCount} SMS)
              </span>
            </div>
            <textarea
              rows={4}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="Escribe el texto del SMS..."
            />
          </div>

          {/* Quick variables */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Insertar Variables Dinámicas
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { name: 'nombre_negocio', label: 'Negocio' },
                { name: 'ciudad', label: 'Ciudad' },
                { name: 'rubro', label: 'Giro' },
                { name: 'sitio_web', label: 'Web' },
                { name: 'mi_empresa', label: 'Mi Empresa' },
                { name: 'mi_web', label: 'Mi Web' },
              ].map((v) => (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => insertVariable(v.name)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  +{v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Windows Phone Link notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-xs">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">¿Cómo funciona el envío por SMS?</p>
              <p className="text-[11px] text-indigo-800 mt-0.5">
                Al hacer clic en <strong>"Abrir en Phone Link / Enviar SMS"</strong>, Windows abrirá tu aplicación <strong>Enlace Móvil (Phone Link)</strong> con el número y el texto listo para enviar desde tu teléfono vinculado.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Texto</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSendSms}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Abrir en Phone Link / Enviar SMS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
