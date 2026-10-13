import React, { useState } from 'react';
import { Lead, PhoneOption } from '../types';
import {
  X,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  Globe,
  Star,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Instagram,
  Facebook,
  Linkedin,
  Save,
  Check,
  MessageCircle,
  Smartphone,
} from 'lucide-react';
import { getLeadPhoneOptions } from '../utils/phoneUtils';

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
  onSaveNotes: (id: string, notes: string) => void;
  onLeadUpdated?: (updatedLead: Lead) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead: initialLead,
  onClose,
  onSaveNotes,
  onLeadUpdated,
}) => {
  if (!initialLead) return null;

  const [lead, setLead] = useState<Lead>(initialLead);
  const [notes, setNotes] = useState(lead.notes || '');
  const [saved, setSaved] = useState(false);
  const [isEnrichingSocial, setIsEnrichingSocial] = useState(false);
  const [socialResultMsg, setSocialResultMsg] = useState<string | null>(null);

  const handleEnrichSocial = async () => {
    setIsEnrichingSocial(true);
    setSocialResultMsg(null);
    try {
      const token = localStorage.getItem('lead_hunter_token') || '';
      const res = await fetch(`/api/leads/${lead.id}/enrich-social`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success && data.lead) {
        setLead(data.lead);
        onLeadUpdated?.(data.lead);
        setSocialResultMsg(data.message);
      } else {
        setSocialResultMsg(data.error || 'No se pudieron extraer datos de redes sociales.');
      }
    } catch (err: any) {
      setSocialResultMsg(`Error: ${err.message}`);
    } finally {
      setIsEnrichingSocial(false);
    }
  };

  const handleSelectPrimaryPhone = async (opt: PhoneOption) => {
    try {
      const token = localStorage.getItem('lead_hunter_token') || '';
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: opt.phone,
          cleanPhone: opt.cleanPhone,
          phoneSource: opt.source,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLead(updated);
        onLeadUpdated?.(updated);
      }
    } catch (err: any) {
      alert(`Error al cambiar teléfono: ${err.message}`);
    }
  };

  const phoneOptions = getLeadPhoneOptions(lead);

  const handleSave = () => {
    onSaveNotes(lead.id, notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold">{lead.name}</h3>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  lead.rankingLevel === 'ALTO'
                    ? 'bg-emerald-500 text-white'
                    : lead.rankingLevel === 'MEDIO'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-700 text-slate-200'
                }`}
              >
                Ranking: {lead.rankingLevel} ({lead.rankingScore} pts)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{lead.category || 'Sin categoría especificada'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs sm:text-sm">
          {/* Diagnostic Box */}
          <div
            className={`p-4 rounded-xl border ${
              lead.rankingLevel === 'ALTO'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : lead.rankingLevel === 'MEDIO'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-1">
              {lead.rankingLevel === 'ALTO' ? (
                <ShieldAlert className="w-5 h-5 text-emerald-600" />
              ) : lead.rankingLevel === 'MEDIO' ? (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-blue-600" />
              )}
              <span>Auditoría de Oportunidad Digital</span>
            </div>
            <p className="text-xs leading-relaxed mt-1">
              {lead.websiteAuditNotes || 'Sin notas de auditoría registradas.'}
            </p>
          </div>

          {/* Multiple Phone Numbers Section */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-green-600" />
                <span>Números Telefónicos Detectados ({phoneOptions.length})</span>
              </span>
              {phoneOptions.length > 1 && (
                <span className="text-[11px] text-slate-500 font-medium">
                  Selecciona cuál usar para WhatsApp / SMS
                </span>
              )}
            </div>

            {phoneOptions.length > 0 ? (
              <div className="space-y-2">
                {phoneOptions.map((opt, idx) => {
                  const isPrimary = lead.cleanPhone === opt.cleanPhone;
                  return (
                    <div
                      key={`${opt.cleanPhone}_${idx}`}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-all gap-2 ${
                        isPrimary
                          ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Phone className={`w-4 h-4 ${isPrimary ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 font-mono text-sm">{opt.phone}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {opt.source}
                            </span>
                            {isPrimary && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                                Principal
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        {!isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleSelectPrimaryPhone(opt)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="Hacer este número el principal del prospecto"
                          >
                            Usar como principal
                          </button>
                        )}
                        <a
                          href={`https://wa.me/${opt.cleanPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                          title="Abrir chat en WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          <span>WhatsApp</span>
                        </a>
                        <a
                          href={`sms:${opt.cleanPhone}`}
                          className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                          title="Abrir en Windows Phone Link (SMS)"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>SMS</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No hay teléfonos registrados para este negocio.</p>
            )}
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            {/* Email */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Correo Electrónico</span>
              <div className="flex items-center gap-2 text-slate-800 font-medium truncate">
                <Mail className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="truncate">{lead.email || 'No detectado en web'}</span>
              </div>
            </div>

            {/* Website */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Sitio Web</span>
              <div className="flex items-center gap-2 text-slate-800 font-medium truncate">
                <Globe className="w-4 h-4 text-brand-600 shrink-0" />
                {lead.website ? (
                  <a
                    href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-600 hover:underline truncate"
                  >
                    {lead.website}
                  </a>
                ) : (
                  <span className="text-slate-400">Sin sitio web</span>
                )}
              </div>
            </div>

            {/* Google Maps Link */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Ficha en Google Maps</span>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                <a
                  href={lead.googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-600 hover:underline flex items-center gap-1 font-medium"
                >
                  <span>Abrir ficha en Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Social Media Links & Search */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Redes Sociales & Búsqueda de Contacto
              </span>
              <button
                type="button"
                onClick={handleEnrichSocial}
                disabled={isEnrichingSocial}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold border border-indigo-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isEnrichingSocial ? (
                  <span>Buscando en Facebook/Instagram...</span>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    <span>Buscar Contacto en Redes</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {lead.socialInstagram && (
                <a
                  href={lead.socialInstagram}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 text-pink-700 border border-pink-200 rounded-lg font-medium hover:bg-pink-100 transition-colors"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  <span>Instagram</span>
                </a>
              )}
              {lead.socialFacebook && (
                <a
                  href={lead.socialFacebook}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-medium hover:bg-blue-100 transition-colors"
                >
                  <Facebook className="w-3.5 h-3.5" />
                  <span>Facebook</span>
                </a>
              )}
              {lead.socialLinkedin && (
                <a
                  href={lead.socialLinkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg font-medium hover:bg-sky-100 transition-colors"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  <span>LinkedIn</span>
                </a>
              )}
              {!lead.socialInstagram && !lead.socialFacebook && !lead.socialLinkedin && (
                <p className="text-xs text-slate-400 italic">No hay enlaces sociales asociados a este prospecto.</p>
              )}
            </div>

            {socialResultMsg && (
              <div className="text-xs text-indigo-800 bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-100">
                {socialResultMsg}
              </div>
            )}
          </div>

          {/* Internal Notes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Notas de Seguimiento Comercial (Privado)
              </label>
              {saved && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  Guardado
                </span>
              )}
            </div>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escribe notas de llamadas, acuerdos, presupuesto estimado..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Nota</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
