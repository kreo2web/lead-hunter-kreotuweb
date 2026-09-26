import React, { useState } from 'react';
import { Search, Loader2, MapPin, Briefcase, Zap, CheckCircle2 } from 'lucide-react';

interface SearchPanelProps {
  isSearching: boolean;
  onStartSearch: (query: string, limit: number) => void;
  searchProgress: {
    status: string;
    step: 'SEARCHING' | 'EXTRACTING' | 'ENRICHING' | 'COMPLETED' | 'ERROR' | 'IDLE';
    current: number;
    total: number;
  };
}

const POPULAR_NICHES = [
  'Clínicas Dentales',
  'Restaurantes',
  'Ferreterías',
  'Abogados',
  'Talleres Mecánicos',
  'Gimnasios',
  'Salones de Belleza',
  'Inmobiliarias',
  'Veterinarias',
];

export const SearchPanel: React.FC<SearchPanelProps> = ({
  isSearching,
  onStartSearch,
  searchProgress,
}) => {
  const [niche, setNiche] = useState('');
  const [location, setLocation] = useState('');
  const [limit, setLimit] = useState(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche.trim() || !location.trim()) return;
    const fullQuery = `${niche.trim()} en ${location.trim()}`;
    onStartSearch(fullQuery, limit);
  };

  const calculatePercent = () => {
    if (!searchProgress.total || searchProgress.total === 0) return 0;
    if (searchProgress.step === 'COMPLETED') return 100;
    return Math.round((searchProgress.current / searchProgress.total) * 100);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 mb-6 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Search className="w-5 h-5 text-brand-600" />
            Explorador de Prospectos en Google Maps
          </h2>
          <p className="text-sm text-slate-500">
            Extrae negocios automáticamente, audita si tienen web o si es obsoleta, y descubre sus emails y redes sociales.
          </p>
        </div>

        {/* Niche quick suggestions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400 font-medium">Sugerencias:</span>
          {POPULAR_NICHES.slice(0, 4).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setNiche(item)}
              className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Rubro */}
          <div className="sm:col-span-5 relative">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Rubro o Categoría de Negocio
            </label>
            <div className="relative">
              <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Ej. Clínicas Dentales, Restaurantes..."
                disabled={isSearching}
                required
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          {/* Localidad */}
          <div className="sm:col-span-4 relative">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Ciudad, Zona o País
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej. Madrid, Ciudad de México, Bogotá..."
                disabled={isSearching}
                required
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          {/* Límite */}
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Cantidad a Extraer
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10))}
              disabled={isSearching}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium text-slate-700"
            >
              <option value={5}>5 prospectos (Rápido)</option>
              <option value={10}>10 prospectos (Recomendado)</option>
              <option value={20}>20 prospectos</option>
              <option value={30}>30 prospectos</option>
              <option value={50}>50 prospectos (Profundo)</option>
            </select>
          </div>
        </div>

        {/* Submit button */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="submit"
            disabled={isSearching || !niche.trim() || !location.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-brand-500/20 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Extrayendo y Auditando...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-current" />
                <span>Buscar Prospectos en Maps</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Real-time Progress Card */}
      {isSearching && (
        <div className="mt-5 p-4 bg-slate-50 border border-brand-200 rounded-xl">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
            <span className="flex items-center gap-1.5 text-brand-700">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
              {searchProgress.status || 'Procesando consulta...'}
            </span>
            <span>
              {searchProgress.current} / {searchProgress.total || limit} ({calculatePercent()}%)
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-brand-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${calculatePercent()}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>Paso 1: Localizar fichas en Google Maps</span>
            <span>Paso 2: Extraer teléfono y sitio web</span>
            <span>Paso 3: Analizar tecnología y extraer emails</span>
          </div>
        </div>
      )}

      {searchProgress.step === 'COMPLETED' && !isSearching && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {searchProgress.status || 'Búsqueda completada exitosamente.'}
          </span>
        </div>
      )}
    </div>
  );
};
