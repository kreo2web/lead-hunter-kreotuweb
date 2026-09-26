import React from 'react';
import { Stats } from '../types';
import { ShieldAlert, AlertTriangle, CheckCircle2, Phone, Mail, Send, Users } from 'lucide-react';

interface StatsBarProps {
  stats: Stats;
  activeRankingFilter: string;
  onSelectRankingFilter: (ranking: string) => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  stats,
  activeRankingFilter,
  onSelectRankingFilter,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
      {/* Total Leads */}
      <button
        onClick={() => onSelectRankingFilter('ALL')}
        className={`p-3.5 rounded-xl border text-left transition-all ${
          activeRankingFilter === 'ALL'
            ? 'bg-brand-50 border-brand-300 ring-2 ring-brand-500/20 shadow-xs'
            : 'bg-white border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</span>
          <Users className="w-4 h-4 text-slate-400" />
        </div>
        <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        <span className="text-xs text-slate-500 font-medium">Prospectos guardados</span>
      </button>

      {/* Prioridad Alta (Sin Web) */}
      <button
        onClick={() => onSelectRankingFilter('ALTO')}
        className={`p-3.5 rounded-xl border text-left transition-all ${
          activeRankingFilter === 'ALTO'
            ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
            : 'bg-white border-slate-200 hover:border-emerald-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Top Oportunidad</span>
          <ShieldAlert className="w-4 h-4 text-emerald-600" />
        </div>
        <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.alto}</p>
        <span className="text-xs text-emerald-600 font-medium">Sin Sitio Web (Ranking Alto)</span>
      </button>

      {/* Prioridad Media (Web Antigua) */}
      <button
        onClick={() => onSelectRankingFilter('MEDIO')}
        className={`p-3.5 rounded-xl border text-left transition-all ${
          activeRankingFilter === 'MEDIO'
            ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
            : 'bg-white border-slate-200 hover:border-amber-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Rediseño Web</span>
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
        <p className="text-2xl font-bold text-amber-700 mt-1">{stats.medio}</p>
        <span className="text-xs text-amber-600 font-medium">Web Antigua (Ranking Medio)</span>
      </button>

      {/* Prioridad Baja (Web Moderna) */}
      <button
        onClick={() => onSelectRankingFilter('BAJO')}
        className={`p-3.5 rounded-xl border text-left transition-all ${
          activeRankingFilter === 'BAJO'
            ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
            : 'bg-white border-slate-200 hover:border-blue-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">SEO / Marketing</span>
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
        </div>
        <p className="text-2xl font-bold text-blue-700 mt-1">{stats.bajo}</p>
        <span className="text-xs text-blue-600 font-medium">Web Moderna (Ranking Bajo)</span>
      </button>

      {/* Con Teléfono */}
      <div className="p-3.5 rounded-xl border bg-white border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Teléfono</span>
          <Phone className="w-4 h-4 text-green-600" />
        </div>
        <p className="text-2xl font-bold text-slate-800 mt-1">{stats.withPhone}</p>
        <span className="text-xs text-slate-500 font-medium">Listos para WhatsApp</span>
      </div>

      {/* Con Email */}
      <div className="p-3.5 rounded-xl border bg-white border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</span>
          <Mail className="w-4 h-4 text-sky-600" />
        </div>
        <p className="text-2xl font-bold text-slate-800 mt-1">{stats.withEmail}</p>
        <span className="text-xs text-slate-500 font-medium">Correos extraídos</span>
      </div>

      {/* Contactados */}
      <div className="p-3.5 rounded-xl border bg-white border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contactados</span>
          <Send className="w-4 h-4 text-indigo-600" />
        </div>
        <p className="text-2xl font-bold text-slate-800 mt-1">{stats.contacted}</p>
        <span className="text-xs text-slate-500 font-medium">Por WhatsApp / Email</span>
      </div>
    </div>
  );
};
