import React from 'react';
import { Target, FileText, Settings as SettingsIcon, Globe, Sparkles, LogOut, Home, Lock, Users as UsersIcon, ShieldCheck, User as UserIcon, Bot } from 'lucide-react';
import { AuthUser } from '../types';

interface HeaderProps {
  currentTab: 'landing' | 'leads' | 'templates' | 'whatsapp' | 'settings' | 'users';
  setCurrentTab: (tab: 'landing' | 'leads' | 'templates' | 'whatsapp' | 'settings' | 'users') => void;
  totalLeads: number;
  isLoggedIn: boolean;
  currentUser: AuthUser | null;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  totalLeads,
  isLoggedIn,
  currentUser,
  onOpenLogin,
  onLogout,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            onClick={() => setCurrentTab('landing')}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">Lead Hunter</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                  <Sparkles className="w-3 h-3 text-brand-500" />
                  Kreotuweb.com
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">Prospección en Google Maps y Outreach Automatizado</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {/* Home / Landing Tab */}
              <button
                onClick={() => setCurrentTab('landing')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  currentTab === 'landing'
                    ? 'bg-white text-brand-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Inicio</span>
              </button>

              {isLoggedIn ? (
                <>
                  <button
                    onClick={() => setCurrentTab('leads')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      currentTab === 'leads'
                        ? 'bg-white text-brand-700 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>Prospectos</span>
                    {totalLeads > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] bg-brand-100 text-brand-800">
                        {totalLeads}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setCurrentTab('templates')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      currentTab === 'templates'
                        ? 'bg-white text-brand-700 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">Plantillas</span>
                  </button>

                  {/* WhatsApp AI Bot Tab */}
                  <button
                    onClick={() => setCurrentTab('whatsapp')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      currentTab === 'whatsapp'
                        ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Bot className="w-4 h-4 text-emerald-600" />
                    <span className="hidden sm:inline">Robot WhatsApp</span>
                  </button>

                  {/* Users tab - Admin Only */}
                  {isAdmin && (
                    <button
                      onClick={() => setCurrentTab('users')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                        currentTab === 'users'
                          ? 'bg-white text-purple-700 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <UsersIcon className="w-4 h-4 text-purple-600" />
                      <span className="hidden sm:inline">Usuarios</span>
                    </button>
                  )}

                  <button
                    onClick={() => setCurrentTab('settings')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      currentTab === 'settings'
                        ? 'bg-white text-brand-700 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <SettingsIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Ajustes</span>
                  </button>
                </>
              ) : null}
            </nav>

            {/* Auth Buttons and user info */}
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                {currentUser && (
                  <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 rounded-xl text-xs font-medium text-slate-700 border border-slate-200">
                    {isAdmin ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    ) : (
                      <UserIcon className="w-3.5 h-3.5 text-sky-600" />
                    )}
                    <span className="font-semibold text-slate-800">{currentUser.username}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-600 uppercase font-bold">
                      {isAdmin ? 'Admin' : 'Usuario'}
                    </span>
                  </div>
                )}

                <button
                  onClick={onLogout}
                  title="Cerrar sesión"
                  className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-rose-200"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Salir</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Acceder</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
