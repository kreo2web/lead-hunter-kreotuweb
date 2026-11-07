import React, { useState } from 'react';
import { Search, Loader2, MapPin, Briefcase, Zap, Sparkles, TrendingUp, Check, ChevronRight, CheckCircle2, X } from 'lucide-react';

interface SearchPanelProps {
  isSearching: boolean;
  onStartSearch: (query: string, limit: number, locationDetails?: { city: string; state: string; country: string }) => void;
  searchProgress: {
    status: string;
    step: 'SEARCHING' | 'EXTRACTING' | 'ENRICHING' | 'COMPLETED' | 'ERROR' | 'IDLE';
    current: number;
    total: number;
  };
  searchQueriesList?: string[];
}

interface NicheRecommendation {
  category: string;
  reason: string;
  opportunityLevel: 'ALTA' | 'MEDIA' | 'BAJA';
  suggestedSearch: string;
  estimatedDensity: 'ALTA' | 'MEDIA' | 'BAJA';
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
  searchQueriesList = [],
}) => {
  const [niche, setNiche] = useState('');
  const [location, setLocation] = useState('');
  const [limit, setLimit] = useState(10);

  // AI & Density recommendation states
  const [isRecommending, setIsRecommending] = useState(false);
  const [recommendations, setRecommendations] = useState<NicheRecommendation[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [searchedCategories, setSearchedCategories] = useState<string[]>([]);

  // Check if a category has been prospected already (either in this session or in existing database queries)
  const isCategoryProspected = (cat: string) => {
    const cleanCat = cat.trim().toLowerCase();
    // 1. Checked in local session
    if (searchedCategories.some(c => c.toLowerCase() === cleanCat)) return true;
    // 2. Checked against historical search queries in database
    return searchQueriesList.some(q => {
      const qLower = q.toLowerCase();
      return qLower.includes(cleanCat);
    });
  };

  // Parse location into city, state, country helper
  const parseLocation = (locStr: string) => {
    const parts = locStr.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 1) return { city: parts[0], state: '', country: '' };
    if (parts.length === 2) return { city: parts[0], state: '', country: parts[1] };
    return {
      city: parts[0],
      state: parts.slice(1, -1).join(', '),
      country: parts[parts.length - 1],
    };
  };

  const handleSelectRecommendation = (item: NicheRecommendation, autoStart: boolean = false) => {
    if (isSearching) return;
    setNiche(item.category);
    // Keep recommendations card open so user can continue picking other cards
    if (autoStart && location.trim()) {
      setSearchedCategories(prev => prev.includes(item.category) ? prev : [...prev, item.category]);
      const fullQuery = `${item.category.trim()} en ${location.trim()}`;
      onStartSearch(fullQuery, limit, parseLocation(location.trim()));
    }
  };

  const handleFetchRecommendations = async () => {
    if (!location.trim()) {
      alert('Por favor ingresa primero la Ciudad o Zona para sondear la densidad y recomendarte rubros.');
      return;
    }

    setIsRecommending(true);
    setRecommendationError(null);
    setShowRecommendations(true);

    try {
      const locDetails = parseLocation(location.trim());
      const res = await fetch('/api/search/recommend-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: locDetails.city,
          country: [locDetails.state, locDetails.country].filter(Boolean).join(', '),
        }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.recommendations) {
        setRecommendations(data.recommendations);
      } else {
        setRecommendationError(data.error || 'No se pudieron obtener recomendaciones');
      }
    } catch (err: any) {
      setRecommendationError(err.message || 'Error de conexión');
    } finally {
      setIsRecommending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche.trim() || !location.trim()) return;
    setSearchedCategories(prev => prev.includes(niche.trim()) ? prev : [...prev, niche.trim()]);
    const fullQuery = `${niche.trim()} en ${location.trim()}`;
    onStartSearch(fullQuery, limit, parseLocation(location.trim()));
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-600">
                Rubro o Categoría de Negocio
              </label>
              <button
                type="button"
                onClick={handleFetchRecommendations}
                disabled={isRecommending || isSearching}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                title="Sondear densidad en Google Maps y recomendar rubros con IA"
              >
                {isRecommending ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-brand-600" />
                    <span>Sondeando Maps...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-brand-600" />
                    <span>Sugerir con IA</span>
                  </>
                )}
              </button>
            </div>
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
              Ciudad/Municipio, Estado, País
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej. Progreso, Yucatán, México"
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

      {/* AI & Density Recommendations Modal / Card */}
      {showRecommendations && (
        <div className="mt-5 p-5 bg-gradient-to-br from-brand-50/50 via-white to-slate-50 border border-brand-200 rounded-2xl shadow-xs animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-brand-600 text-white shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Rubros Recomendados en {location || 'tu ciudad'}
                </h3>
                <p className="text-xs text-slate-500">
                  Basado en sondeo de densidad real en Google Maps y análisis comercial de IA
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowRecommendations(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isRecommending ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-3 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              <p className="text-xs font-semibold text-slate-700">Sondeando presencia comercial en Google Maps...</p>
              <p className="text-[11px] text-slate-400">Analizando densidad y oportunidades para {location}</p>
            </div>
          ) : recommendationError ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {recommendationError}
            </div>
          ) : recommendations.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3">
              {recommendations.map((item, idx) => {
                const prospected = isCategoryProspected(item.category);
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (prospected) return;
                      handleSelectRecommendation(item, false);
                    }}
                    className={`group p-3 rounded-xl border transition-all flex flex-col justify-between ${
                      prospected
                        ? 'bg-slate-100/90 border-slate-200/80 opacity-60 cursor-not-allowed select-none'
                        : 'bg-white hover:bg-brand-50/60 border-slate-200 hover:border-brand-300 cursor-pointer shadow-2xs hover:shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs font-bold transition-colors ${
                          prospected ? 'text-slate-500 line-through' : 'text-slate-900 group-hover:text-brand-700'
                        }`}>
                          {item.category}
                        </span>
                        {prospected ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-600 flex items-center gap-1">
                            <Check className="w-3 h-3 text-slate-500" /> Ya buscado
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              item.opportunityLevel === 'ALTA'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.opportunityLevel === 'ALTA' ? '🔥 Alta Op.' : '⭐ Oportunidad'}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] line-clamp-2 leading-relaxed ${prospected ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.reason}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-slate-400" />
                        Densidad: <strong className={prospected ? 'text-slate-500' : 'text-slate-600'}>{item.estimatedDensity}</strong>
                      </span>
                      {prospected ? (
                        <span className="text-slate-400 font-semibold text-[10px]">
                          Completado
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRecommendation(item, true);
                          }}
                          disabled={isSearching}
                          className="text-brand-600 hover:text-brand-700 font-bold group-hover:translate-x-0.5 transition-all flex items-center gap-0.5 cursor-pointer disabled:cursor-not-allowed"
                          title="Buscar prospectos de este rubro directamente"
                        >
                          Buscar <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
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

      {searchProgress.step === 'ERROR' && !isSearching && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800">
          <span className="flex items-center gap-2 font-medium">
            <X className="w-4 h-4 text-rose-600" />
            {searchProgress.status || 'Ocurrió un error o se interrumpió la búsqueda.'}
          </span>
        </div>
      )}
    </div>
  );
};
