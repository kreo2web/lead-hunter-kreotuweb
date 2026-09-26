import React from 'react';
import { Lead } from '../types';
import {
  MessageCircle,
  Mail,
  ExternalLink,
  MapPin,
  Star,
  Globe,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Info,
  Instagram,
  Facebook,
  Linkedin,
} from 'lucide-react';

interface LeadsTableProps {
  leads: Lead[];
  onOpenWhatsApp: (lead: Lead) => void;
  onOpenEmail: (lead: Lead) => void;
  onOpenDetail: (lead: Lead) => void;
  onUpdateStatus: (id: string, status: Lead['status']) => void;
  onDeleteLead: (id: string) => void;
}

export const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  onOpenWhatsApp,
  onOpenEmail,
  onOpenDetail,
  onUpdateStatus,
  onDeleteLead,
}) => {
  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
          <Globe className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800">No se encontraron prospectos</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Utiliza la barra de búsqueda superior para buscar negocios en Google Maps o cambia los filtros seleccionados.
        </p>
      </div>
    );
  }

  const getRankingBadge = (level: string, score: number) => {
    if (level === 'ALTO') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          ALTO ({score} pts)
        </span>
      );
    }
    if (level === 'MEDIO') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          MEDIO ({score} pts)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
        BAJO ({score} pts)
      </span>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONTACTADO_WA':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'CONTACTADO_EMAIL':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'INTERESADO':
        return 'bg-purple-50 text-purple-700 border-purple-200 font-bold';
      case 'CERRADO':
        return 'bg-emerald-600 text-white border-emerald-700 font-bold';
      case 'DESCARTADO':
        return 'bg-slate-100 text-slate-400 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3.5 px-4">Prioridad / Ranking</th>
              <th className="py-3.5 px-4">Negocio & Categoría</th>
              <th className="py-3.5 px-4">Sitio Web & Diagnóstico</th>
              <th className="py-3.5 px-4">Outreach (WhatsApp / Email)</th>
              <th className="py-3.5 px-4">Ubicación</th>
              <th className="py-3.5 px-4">Estado</th>
              <th className="py-3.5 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead) => {
              const hasPhone = Boolean(lead.cleanPhone || lead.phone);
              const hasEmail = Boolean(lead.email);

              return (
                <tr
                  key={lead.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  {/* Ranking */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {getRankingBadge(lead.rankingLevel, lead.rankingScore)}
                      <p className="text-[11px] text-slate-500 font-medium">
                        {lead.rankingLevel === 'ALTO'
                          ? 'Venta de Web'
                          : lead.rankingLevel === 'MEDIO'
                          ? 'Rediseño Web'
                          : 'SEO / Ads'}
                      </p>
                    </div>
                  </td>

                  {/* Business info */}
                  <td className="py-3 px-4">
                    <div className="max-w-xs">
                      <a
                        href={lead.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-slate-900 hover:text-brand-600 flex items-center gap-1.5 transition-colors"
                      >
                        <span>{lead.name}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-brand-500 shrink-0" />
                      </a>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {lead.category && (
                          <span className="text-xs text-slate-600 font-medium">{lead.category}</span>
                        )}
                        {lead.rating && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 font-semibold">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {lead.rating}
                            {lead.reviewsCount ? (
                              <span className="text-slate-400 text-[11px]">({lead.reviewsCount})</span>
                            ) : null}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Website & Diagnostic */}
                  <td className="py-3 px-4">
                    <div className="max-w-xs space-y-1">
                      {lead.website ? (
                        <div className="space-y-1">
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 hover:underline font-medium break-all"
                          >
                            <Globe className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[180px]">{lead.website.replace(/^https?:\/\//, '')}</span>
                          </a>
                          {lead.isOutdatedWebsite ? (
                            <div className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <AlertCircle className="w-3 h-3 shrink-0 text-amber-500" />
                              <span className="truncate" title={lead.websiteAuditNotes || ''}>
                                {lead.websiteAuditNotes || 'Web antigua detectada'}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[11px] text-emerald-700">
                              <ShieldCheck className="w-3 h-3 shrink-0 text-emerald-500" />
                              <span>SSL & Responsive</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Sin Sitio Web</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Outreach buttons & socials */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        {/* WhatsApp Button */}
                        <button
                          onClick={() => onOpenWhatsApp(lead)}
                          disabled={!hasPhone}
                          title={hasPhone ? `Enviar WhatsApp a ${lead.phone}` : 'Sin teléfono registrado'}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            hasPhone
                              ? 'bg-green-600 hover:bg-green-700 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          <span>WhatsApp</span>
                        </button>

                        {/* Email Button */}
                        <button
                          onClick={() => onOpenEmail(lead)}
                          disabled={!hasEmail}
                          title={hasEmail ? `Enviar Email a ${lead.email}` : 'Sin correo registrado'}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            hasEmail
                              ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Email</span>
                        </button>
                      </div>

                      {/* Display extracted email or socials */}
                      <div className="flex items-center gap-2 text-slate-400">
                        {lead.email && (
                          <span className="text-[11px] text-slate-600 font-mono truncate max-w-[150px]">
                            {lead.email}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          {lead.socialInstagram && (
                            <a
                              href={lead.socialInstagram}
                              target="_blank"
                              rel="noreferrer"
                              className="text-pink-600 hover:text-pink-700"
                              title="Instagram"
                            >
                              <Instagram className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {lead.socialFacebook && (
                            <a
                              href={lead.socialFacebook}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:text-blue-700"
                              title="Facebook"
                            >
                              <Facebook className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {lead.socialLinkedin && (
                            <a
                              href={lead.socialLinkedin}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-700 hover:text-sky-800"
                              title="LinkedIn"
                            >
                              <Linkedin className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="py-3 px-4">
                    <div className="text-xs text-slate-600 max-w-xs space-y-0.5">
                      <div className="flex items-start gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                        <span className="truncate">{lead.address || 'Dirección no especificada'}</span>
                      </div>
                      {lead.city && <p className="text-[11px] text-slate-400 pl-4">{lead.city}</p>}
                    </div>
                  </td>

                  {/* Status Dropdown */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <select
                      value={lead.status}
                      onChange={(e) => onUpdateStatus(lead.id, e.target.value as Lead['status'])}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer ${getStatusColor(
                        lead.status
                      )}`}
                    >
                      <option value="NUEVO">Nuevo</option>
                      <option value="CONTACTADO_WA">Contactado WA</option>
                      <option value="CONTACTADO_EMAIL">Contactado Email</option>
                      <option value="INTERESADO">Interesado</option>
                      <option value="CERRADO">Cliente Cerrado</option>
                      <option value="DESCARTADO">Descartado</option>
                    </select>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onOpenDetail(lead)}
                        title="Ver auditoría y notas del prospecto"
                        className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteLead(lead.id)}
                        title="Eliminar de la lista"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
