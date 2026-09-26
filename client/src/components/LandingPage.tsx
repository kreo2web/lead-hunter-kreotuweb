import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  Mail,
  Download,
  Search,
  ExternalLink,
  ChevronRight,
  Star,
  Globe,
  Share2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface LandingPageProps {
  onOpenLogin: () => void;
  isLoggedIn: boolean;
  onGoToDashboard: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenLogin,
  isLoggedIn,
  onGoToDashboard,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-brand-500 selection:text-white">

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold shadow-xs animate-in fade-in slide-in-from-top duration-500">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Prospección Automatizada en Google Maps para Agencias</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Encuentra clientes que <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-sky-500">necesitan tu servicio web</span> hoy mismo
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              Rastrea negocios en Google Maps, detecta automáticamente quiénes <strong>no tienen sitio web o usan solo una red social</strong>, y contáctalos de inmediato mediante <strong>WhatsApp (1-Click)</strong> y <strong>Email HTML con servidor SMTP</strong>.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={isLoggedIn ? onGoToDashboard : onOpenLogin}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-brand-500/25 cursor-pointer"
              >
                <span>{isLoggedIn ? 'Abrir Panel de Prospección' : 'Iniciar Sesión en el Panel'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#ranking"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 transition-colors shadow-xs"
              >
                <span>Ver Cómo Clasifica los Prospectos</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </a>
            </div>
          </div>

          {/* Interactive Mock Interface Card */}
          <div className="mt-14 max-w-5xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-2xl p-4 sm:p-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400"></span>
                <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                <span className="text-xs font-semibold text-slate-500 ml-2 font-mono">
                  Búsqueda: "Clínicas Dentales en Madrid"
                </span>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                10 Prospectos Auditados
              </span>
            </div>

            {/* Mock Table rows */}
            <div className="space-y-2.5">
              {/* Row 1: Sin Sitio Web */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-xs">
                    🟢 ALTO (95 pts)
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Clínica Dental Sonrisas</h4>
                    <p className="text-xs text-slate-500">Sin sitio web en Google Maps • +34 912 34 56 78</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <span className="text-xs font-semibold text-emerald-800 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200">
                    Oportunidad: Venta Web desde Cero
                  </span>
                  <span className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 fill-current" /> WhatsApp
                  </span>
                </div>
              </div>

              {/* Row 2: Red Social como Web */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
                    🟢 ALTO (98 pts)
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Odontología Integral Norte</h4>
                    <p className="text-xs text-slate-500">
                      Usa Instagram como "web" (instagram.com/odontonorte) • Email extraído
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <span className="text-xs font-semibold text-emerald-800 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                    <Share2 className="w-3 h-3 text-pink-600" /> Sin Web Propia (Solo Red Social)
                  </span>
                  <span className="px-3 py-1.5 bg-sky-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> Email HTML
                  </span>
                </div>
              </div>

              {/* Row 3: Web Antigua */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs">
                    🟡 MEDIO (75 pts)
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Centro Dental Chamberí</h4>
                    <p className="text-xs text-slate-500">http://dentalchamberi.es • Sin certificado SSL (No seguro)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <span className="text-xs font-semibold text-amber-800 bg-white/80 px-2.5 py-1 rounded-lg border border-amber-200">
                    Oportunidad: Rediseño & SSL
                  </span>
                  <span className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 fill-current" /> WhatsApp
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ranking Breakdown Section */}
      <section id="ranking" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
              Scoring Inteligente de Oportunidad
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              ¿Cómo clasifica Lead Hunter a cada prospecto?
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              No pierdas tiempo contactando a empresas que ya tienen una web perfecta. Nuestro algoritmo prioriza a quienes más te necesitan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Alto */}
            <div className="p-6 rounded-3xl bg-emerald-50/50 border-2 border-emerald-300 flex flex-col justify-between shadow-xs">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white">
                    Prioridad ALTA (95-98 pts)
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Sin Sitio Web o Solo Red Social</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Negocios que no tienen web en Google Maps o que colocaron su enlace de <strong>Facebook, Instagram o Linktree</strong> como sustituto.
                </p>
                <div className="mt-4 p-3 bg-white rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <p className="font-bold">🎯 Argumento de Venta:</p>
                  <p>
                    "Estás perdiendo clientes que buscan en Google porque no tienes un sitio web oficial e independiente de las redes."
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-emerald-200/60 text-xs font-semibold text-emerald-700">
                Servicio: Diseño Web desde Cero
              </div>
            </div>

            {/* Card 2: Medio */}
            <div className="p-6 rounded-3xl bg-amber-50/50 border-2 border-amber-300 flex flex-col justify-between shadow-xs">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 mb-4">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                    Prioridad MEDIA (70-85 pts)
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Sitio Web Antiguo o Deficiente</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Negocios con página web pero que presentan problemas críticos: <strong>sin certificado SSL (HTTP inseguro)</strong>, no adaptadas a móviles o con copyright obsoleto.
                </p>
                <div className="mt-4 p-3 bg-white rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                  <p className="font-bold">🎯 Argumento de Venta:</p>
                  <p>
                    "Tu web actual se ve mal en celulares y los navegadores la marcan como 'No Segura', lo que ahuyenta a tus visitantes."
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-amber-200/60 text-xs font-semibold text-amber-700">
                Servicio: Rediseño Web & Optimización
              </div>
            </div>

            {/* Card 3: Bajo */}
            <div className="p-6 rounded-3xl bg-blue-50/50 border-2 border-blue-200 flex flex-col justify-between shadow-xs">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 mb-4">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500 text-white">
                    Prioridad BAJA (30 pts)
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Sitio Web Moderno y Activo</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Negocios con sitio web seguro (HTTPS) y diseño responsive. Tienen buena infraestructura digital básica.
                </p>
                <div className="mt-4 p-3 bg-white rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
                  <p className="font-bold">🎯 Argumento de Venta:</p>
                  <p>
                    "Tu web está bien hecha, pero ¿está saliendo en los primeros resultados de Google? Te ayudamos a posicionarla."
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-blue-200/60 text-xs font-semibold text-blue-700">
                Servicio: SEO Local, Google Ads & Mkt
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
              Características de Vanguardia
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Todo lo que necesitas para tu prospección comercial
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Rastreador en Google Maps</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sin costo de APIs de Google. El navegador Playwright navega de forma automatizada simulando un usuario real para extraer toda la información pública.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 fill-current" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Outreach WhatsApp 1-Click</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Abre conversaciones en WhatsApp Web con un mensaje hiper-personalizado que incluye el nombre del comercio y su diagnóstico web exacto. Cero riesgo de bloqueos.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Editor de Email HTML + SMTP</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Envía correos profesionales directamente desde tu servidor SMTP (Gmail, Zoho, cPanel) con vista previa en tiempo real adaptada a la marca de Kreotuweb.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Share2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Extractor de Emails & Redes</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Visita la página web del negocio y localiza correos de contacto, además de perfiles de Instagram, Facebook, LinkedIn, TikTok y Twitter.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Exportación a Excel y CSV</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Descarga tus prospectos en planillas limpias con un clic. Incluye enlaces de WhatsApp directos listos para tu equipo comercial.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Filtro por Campaña de Búsqueda</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Cada prospección queda etiquetada. Filtra por la consulta que hiciste para comparar rubros y zonas geográficas fácilmente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-gradient-to-br from-brand-600 to-sky-700 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Comienza a conseguir nuevos clientes para Kreotuweb.com
          </h2>
          <p className="text-sky-100 text-sm sm:text-base max-w-xl mx-auto">
            Accede al panel de control para lanzar tu primera búsqueda en Google Maps y contactar a los prospectos con mayor potencial de compra.
          </p>
          <button
            onClick={isLoggedIn ? onGoToDashboard : onOpenLogin}
            className="px-8 py-3.5 bg-white hover:bg-slate-100 text-brand-700 font-bold text-sm rounded-xl transition-all shadow-lg shadow-black/10 cursor-pointer"
          >
            {isLoggedIn ? 'Ingresar al Dashboard' : 'Acceder al Panel de Administrador'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Kreotuweb.com</span>
            <span>• Soluciones en Diseño Web, SEO y Marketing</span>
          </div>
          <p>© {new Date().getFullYear()} Lead Hunter. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};
