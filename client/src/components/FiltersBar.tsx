import React from 'react';
import { Search, Download, Trash2, Filter, Layers, Users } from 'lucide-react';

interface FiltersBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  rankingFilter: string;
  setRankingFilter: (ranking: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  searchQueryFilter: string;
  setSearchQueryFilter: (val: string) => void;
  searchQueriesList: string[];
  onlyWithPhone: boolean;
  setOnlyWithPhone: (val: boolean) => void;
  onlyWithEmail: boolean;
  setOnlyWithEmail: (val: boolean) => void;
  onlyWithoutWeb: boolean;
  setOnlyWithoutWeb: (val: boolean) => void;
  totalFiltered: number;
  totalLeads: number;
  onExportExcel: () => void;
  onExportCsv: () => void;
  onClearAll: () => void;
  isAdmin?: boolean;
  usersList?: { id: string; username: string; companyName?: string }[];
  selectedUserFilter?: string;
  setSelectedUserFilter?: (val: string) => void;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  searchTerm,
  setSearchTerm,
  rankingFilter,
  setRankingFilter,
  statusFilter,
  setStatusFilter,
  searchQueryFilter,
  setSearchQueryFilter,
  searchQueriesList,
  onlyWithPhone,
  setOnlyWithPhone,
  onlyWithEmail,
  setOnlyWithEmail,
  onlyWithoutWeb,
  setOnlyWithoutWeb,
  totalFiltered,
  totalLeads,
  onExportExcel,
  onExportCsv,
  onClearAll,
  isAdmin = false,
  usersList = [],
  selectedUserFilter = 'ME',
  setSelectedUserFilter,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-xs space-y-3">
      {/* Top row: search + export actions */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, categoría o ciudad..."
            className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        {/* Export & Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onExportExcel}
            disabled={totalLeads === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={onExportCsv}
            disabled={totalLeads === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          {totalLeads > 0 && (
            <button
              onClick={onClearAll}
              title="Borrar todos los prospectos de la lista"
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom row: filter tags and status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </div>

          {/* Admin Client/Account Selector */}
          {isAdmin && usersList.length > 0 && (
            <div className="flex items-center gap-1 bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-0.5">
              <Users className="w-3.5 h-3.5 text-purple-600" />
              <select
                value={selectedUserFilter}
                onChange={(e) => setSelectedUserFilter && setSelectedUserFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-purple-900 focus:outline-none cursor-pointer py-1"
              >
                <option value="ME">🏢 Mis Prospectos (Admin / Kreotuweb)</option>
                <option value="ALL">🌐 Todos los Clientes ({usersList.length} cuentas)</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    👤 {u.username} {u.companyName ? `(${u.companyName})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Campaign / Search Query filter */}
          {searchQueriesList.length > 0 && (
            <div className="flex items-center gap-1 bg-brand-50/70 border border-brand-200 rounded-lg px-2 py-0.5">
              <Layers className="w-3.5 h-3.5 text-brand-600" />
              <select
                value={searchQueryFilter}
                onChange={(e) => setSearchQueryFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-brand-800 focus:outline-none cursor-pointer py-1"
              >
                <option value="ALL">Todas las Búsquedas ({searchQueriesList.length})</option>
                {searchQueriesList.map((q) => (
                  <option key={q} value={q}>
                    🔍 {q}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Ranking select */}
          <select
            value={rankingFilter}
            onChange={(e) => setRankingFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="ALL">Todo el Ranking</option>
            <option value="ALTO">🟢 Prioridad Alta (Sin Web / Red Social)</option>
            <option value="MEDIO">🟡 Prioridad Media (Web Antigua)</option>
            <option value="BAJO">⚪ Prioridad Baja (Web Moderna)</option>
          </select>

          {/* Status select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="NUEVO">Nuevo</option>
            <option value="CONTACTADO_WA">Contactado por WhatsApp</option>
            <option value="CONTACTADO_EMAIL">Contactado por Email</option>
            <option value="INTERESADO">Interesado</option>
            <option value="CERRADO">Cliente Cerrado</option>
            <option value="DESCARTADO">Descartado</option>
          </select>

          {/* Quick checkbox toggles */}
          <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-100 select-none">
            <input
              type="checkbox"
              checked={onlyWithPhone}
              onChange={(e) => setOnlyWithPhone(e.target.checked)}
              className="rounded text-brand-600 focus:ring-brand-500"
            />
            <span>Con Teléfono</span>
          </label>

          <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-100 select-none">
            <input
              type="checkbox"
              checked={onlyWithEmail}
              onChange={(e) => setOnlyWithEmail(e.target.checked)}
              className="rounded text-brand-600 focus:ring-brand-500"
            />
            <span>Con Email</span>
          </label>

          <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-100 select-none">
            <input
              type="checkbox"
              checked={onlyWithoutWeb}
              onChange={(e) => setOnlyWithoutWeb(e.target.checked)}
              className="rounded text-brand-600 focus:ring-brand-500"
            />
            <span>Sin Sitio Web</span>
          </label>
        </div>

        {/* Results counter */}
        <div className="text-xs font-medium text-slate-500">
          Mostrando <span className="font-bold text-slate-800">{totalFiltered}</span> de {totalLeads} prospectos
        </div>
      </div>
    </div>
  );
};
