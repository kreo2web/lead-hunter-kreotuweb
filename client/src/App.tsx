import React, { useState, useEffect } from 'react';
import { Lead, Template, Stats, AuthUser } from './types';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { StatsBar } from './components/StatsBar';
import { SearchPanel } from './components/SearchPanel';
import { FiltersBar } from './components/FiltersBar';
import { LeadsTable } from './components/LeadsTable';
import { WhatsAppModal } from './components/WhatsAppModal';
import { EmailModal } from './components/EmailModal';
import { LeadDetailModal } from './components/LeadDetailModal';
import { TemplatesManager } from './components/TemplatesManager';
import { SettingsModal } from './components/SettingsModal';
import { LoginModal } from './components/LoginModal';
import { UsersManager } from './components/UsersManager';
import { WhatsAppBotManager } from './components/WhatsAppBotManager';
import { SetupWizardModal } from './components/SetupWizardModal';
import { Settings } from './types';

export const App: React.FC = () => {
  // Auth state
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('lead_hunter_token'));
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => Boolean(localStorage.getItem('lead_hunter_token')));
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('lead_hunter_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSetupNeeded, setIsSetupNeeded] = useState(false);

  // Active navigation tab
  const [currentTab, setCurrentTab] = useState<'landing' | 'leads' | 'templates' | 'whatsapp' | 'settings' | 'users'>(() =>
    localStorage.getItem('lead_hunter_token') ? 'leads' : 'landing'
  );

  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [searchQueriesList, setSearchQueriesList] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    alto: 0,
    medio: 0,
    bajo: 0,
    withPhone: 0,
    withEmail: 0,
    contacted: 0,
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [rankingFilter, setRankingFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQueryFilter, setSearchQueryFilter] = useState('ALL');
  const [onlyWithPhone, setOnlyWithPhone] = useState(false);
  const [onlyWithEmail, setOnlyWithEmail] = useState(false);
  const [onlyWithoutWeb, setOnlyWithoutWeb] = useState(false);

  // Multi-user filter states (Admin only)
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('ME');
  const [usersList, setUsersList] = useState<{ id: string; username: string; companyName?: string }[]>([]);

  // Search execution states
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState<{
    status: string;
    step: 'SEARCHING' | 'EXTRACTING' | 'ENRICHING' | 'COMPLETED' | 'ERROR' | 'IDLE';
    current: number;
    total: number;
  }>({
    status: '',
    step: 'IDLE',
    current: 0,
    total: 0,
  });

  // Modals state
  const [selectedLeadForWA, setSelectedLeadForWA] = useState<Lead | null>(null);
  const [selectedLeadForEmail, setSelectedLeadForEmail] = useState<Lead | null>(null);
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);

  // Check setup status and verify session on mount
  useEffect(() => {
    // Check if initial admin setup is required
    fetch('/api/auth/setup-status')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.isConfigured === false) {
          setIsSetupNeeded(true);
        } else {
          setIsSetupNeeded(false);
        }
      })
      .catch(() => {});

    const token = localStorage.getItem('lead_hunter_token');
    if (token) {
      fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated && data.user) {
            setCurrentUser(data.user);
            localStorage.setItem('lead_hunter_user', JSON.stringify(data.user));
            setIsLoggedIn(true);
          } else {
            handleLogout();
          }
        })
        .catch(() => {});
    }
  }, []);

  // Fetch users list if current user is admin
  useEffect(() => {
    if (currentUser?.role === 'admin' && authToken) {
      fetch('/api/users', { headers: getHeaders() })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setUsersList(data.map((u: any) => ({ id: u.id, username: u.username, companyName: u.companyName })));
          }
        })
        .catch(() => {});
    } else {
      setUsersList([]);
    }
  }, [currentUser, authToken]);

  useEffect(() => {
    fetchLeads();
    fetchStats();
    fetchTemplates();
    fetchSearchQueries();
    if (authToken) {
      fetchSettings();
    }
  }, [rankingFilter, statusFilter, searchQueryFilter, onlyWithPhone, onlyWithEmail, onlyWithoutWeb, authToken, selectedUserFilter]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<Settings>) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(newSettings),
    });
    if (res.ok) {
      await fetchSettings();
    }
  };

  const getHeaders = () => {
    const token = authToken || localStorage.getItem('lead_hunter_token') || '';
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (rankingFilter !== 'ALL') params.append('ranking', rankingFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchQueryFilter !== 'ALL') params.append('searchQuery', searchQueryFilter);
      if (onlyWithPhone) params.append('hasPhone', 'true');
      if (onlyWithEmail) params.append('hasEmail', 'true');
      if (onlyWithoutWeb) params.append('hasWebsite', 'false');
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      // If admin and a specific user filter is chosen
      if (currentUser?.role === 'admin' && selectedUserFilter) {
        params.append('userId', selectedUserFilter);
      }

      const res = await fetch(`/api/leads?${params.toString()}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (currentUser?.role === 'admin' && selectedUserFilter) {
        params.append('userId', selectedUserFilter);
      }
      const res = await fetch(`/api/leads/stats?${params.toString()}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates', {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  const fetchSearchQueries = async () => {
    try {
      const params = new URLSearchParams();
      if (currentUser?.role === 'admin' && selectedUserFilter) {
        params.append('userId', selectedUserFilter);
      }
      const res = await fetch(`/api/leads/searches?${params.toString()}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSearchQueriesList(data);
      }
    } catch (err) {
      console.error('Error fetching search queries:', err);
    }
  };

  const handleLoginSuccess = (token: string, user: AuthUser) => {
    localStorage.setItem('lead_hunter_token', token);
    localStorage.setItem('lead_hunter_user', JSON.stringify(user));
    setAuthToken(token);
    setCurrentUser(user);
    setIsLoggedIn(true);
    setCurrentTab('leads');
  };

  const handleSetupSuccess = (token: string, user: AuthUser) => {
    localStorage.setItem('lead_hunter_token', token);
    localStorage.setItem('lead_hunter_user', JSON.stringify(user));
    setAuthToken(token);
    setCurrentUser(user);
    setIsLoggedIn(true);
    setIsSetupNeeded(false);
    setCurrentTab('leads');
    fetchLeads();
    fetchStats();
    fetchTemplates();
  };

  const handleLogout = () => {
    const token = authToken || localStorage.getItem('lead_hunter_token') || '';
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem('lead_hunter_token');
    localStorage.removeItem('lead_hunter_user');
    setAuthToken(null);
    setCurrentUser(null);
    setIsLoggedIn(false);
    setCurrentTab('landing');
  };

  // Live scraping with Server-Sent Events
  const handleStartSearch = (query: string, limit: number) => {
    setIsSearching(true);
    setSearchProgress({
      status: `Iniciando rastreo de "${query}" en Google Maps...`,
      step: 'SEARCHING',
      current: 0,
      total: limit,
    });

    const token = authToken || localStorage.getItem('lead_hunter_token') || '';
    const eventSource = new EventSource(
      `/api/search/stream?query=${encodeURIComponent(query)}&limit=${limit}&token=${encodeURIComponent(token)}`
    );

    eventSource.addEventListener('progress', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setSearchProgress({
          status: data.status,
          step: data.step,
          current: data.current,
          total: data.total,
        });

        if (data.lead) {
          setLeads((prev) => {
            const exists = prev.some((l) => l.placeId === data.lead.placeId);
            if (exists) {
              return prev.map((l) => (l.placeId === data.lead.placeId ? data.lead : l));
            }
            return [data.lead, ...prev];
          });
          fetchStats();
          fetchSearchQueries();
        }
      } catch (err) {
        console.error('Error parsing event data:', err);
      }
    });

    eventSource.addEventListener('complete', () => {
      setIsSearching(false);
      setSearchProgress((prev) => ({
        ...prev,
        status: '¡Búsqueda y análisis completados con éxito!',
        step: 'COMPLETED',
      }));
      eventSource.close();
      fetchLeads();
      fetchStats();
      fetchSearchQueries();
    });

    eventSource.addEventListener('error', (e: any) => {
      console.error('EventSource error:', e);
      setIsSearching(false);
      setSearchProgress((prev) => ({
        ...prev,
        status: 'La búsqueda finalizó o fue interrumpida.',
        step: 'ERROR',
      }));
      eventSource.close();
      fetchLeads();
      fetchStats();
      fetchSearchQueries();
    });
  };

  const handleUpdateStatus = async (id: string, newStatus: Lead['status']) => {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)));
        fetchStats();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleSaveNotes = async (id: string, notes: string) => {
    try {
      await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ notes }),
      });
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, notes } : l)));
    } catch (err) {
      console.error('Error saving notes:', err);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm('¿Eliminar este prospecto de la lista?')) return;
    try {
      await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      setLeads((prev) => prev.filter((l) => l.id !== id));
      fetchStats();
      fetchSearchQueries();
    } catch (err) {
      console.error('Error deleting lead:', err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar TODOS tus prospectos guardados? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      const params = new URLSearchParams();
      if (currentUser?.role === 'admin' && selectedUserFilter) {
        params.append('userId', selectedUserFilter);
      }
      await fetch(`/api/leads?${params.toString()}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      setLeads([]);
      setSearchQueriesList([]);
      fetchStats();
    } catch (err) {
      console.error('Error clearing leads:', err);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (lead.name && lead.name.toLowerCase().includes(term)) ||
      (lead.category && lead.category.toLowerCase().includes(term)) ||
      (lead.city && lead.city.toLowerCase().includes(term)) ||
      (lead.address && lead.address.toLowerCase().includes(term)) ||
      (lead.searchQuery && lead.searchQuery.toLowerCase().includes(term))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navigation Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        totalLeads={stats.total}
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* View 1: Landing Page */}
      {currentTab === 'landing' && (
        <LandingPage
          onOpenLogin={() => setIsLoginModalOpen(true)}
          isLoggedIn={isLoggedIn}
          onGoToDashboard={() => setCurrentTab('leads')}
        />
      )}

      {/* View 2: Leads Dashboard (Protected) */}
      {currentTab === 'leads' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
          {/* Search Panel */}
          <SearchPanel
            isSearching={isSearching}
            onStartSearch={handleStartSearch}
            searchProgress={searchProgress}
          />

          {/* Metrics & Ranking Summary Bar */}
          <StatsBar
            stats={stats}
            activeRankingFilter={rankingFilter}
            onSelectRankingFilter={setRankingFilter}
          />

          {/* Filters Bar & Actions */}
          <FiltersBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            rankingFilter={rankingFilter}
            setRankingFilter={setRankingFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            searchQueryFilter={searchQueryFilter}
            setSearchQueryFilter={setSearchQueryFilter}
            searchQueriesList={searchQueriesList}
            onlyWithPhone={onlyWithPhone}
            setOnlyWithPhone={setOnlyWithPhone}
            onlyWithEmail={onlyWithEmail}
            setOnlyWithEmail={setOnlyWithEmail}
            onlyWithoutWeb={onlyWithoutWeb}
            setOnlyWithoutWeb={setOnlyWithoutWeb}
            totalFiltered={filteredLeads.length}
            totalLeads={stats.total}
            isAdmin={currentUser?.role === 'admin'}
            usersList={usersList}
            selectedUserFilter={selectedUserFilter}
            setSelectedUserFilter={setSelectedUserFilter}
            onExportExcel={() => {
              const uParam = currentUser?.role === 'admin' && selectedUserFilter ? `&userId=${encodeURIComponent(selectedUserFilter)}` : '';
              window.open(`/api/leads/export/excel?token=${encodeURIComponent(authToken || '')}${uParam}`, '_blank');
            }}
            onExportCsv={() => {
              const uParam = currentUser?.role === 'admin' && selectedUserFilter ? `&userId=${encodeURIComponent(selectedUserFilter)}` : '';
              window.open(`/api/leads/export/csv?token=${encodeURIComponent(authToken || '')}${uParam}`, '_blank');
            }}
            onClearAll={handleClearAll}
          />

          {/* Interactive Prospects Table */}
          <LeadsTable
            leads={filteredLeads}
            onOpenWhatsApp={(lead) => setSelectedLeadForWA(lead)}
            onOpenEmail={(lead) => setSelectedLeadForEmail(lead)}
            onOpenDetail={(lead) => setSelectedLeadForDetail(lead)}
            onUpdateStatus={handleUpdateStatus}
            onDeleteLead={handleDeleteLead}
          />
        </main>
      )}

      {/* View 3: Templates Manager (Protected) */}
      {currentTab === 'templates' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
          <TemplatesManager
            templates={templates}
            onRefreshTemplates={fetchTemplates}
          />
        </main>
      )}

      {/* View: WhatsApp AI Bot (Protected) */}
      {currentTab === 'whatsapp' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
          <WhatsAppBotManager
            authToken={authToken || ''}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
          />
        </main>
      )}

      {/* View 4: Users Manager (Admin Only) */}
      {currentTab === 'users' && currentUser?.role === 'admin' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
          <UsersManager
            currentUser={currentUser}
            authToken={authToken}
          />
        </main>
      )}

      {/* View 5: Settings (Protected) */}
      {currentTab === 'settings' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
          <SettingsModal />
        </main>
      )}

      {/* WhatsApp Modal */}
      {selectedLeadForWA && (
        <WhatsAppModal
          lead={selectedLeadForWA}
          templates={templates}
          onClose={() => setSelectedLeadForWA(null)}
          onSent={(id) => handleUpdateStatus(id, 'CONTACTADO_WA')}
        />
      )}

      {/* Email Modal */}
      {selectedLeadForEmail && (
        <EmailModal
          lead={selectedLeadForEmail}
          templates={templates}
          onClose={() => setSelectedLeadForEmail(null)}
          onSent={(id) => handleUpdateStatus(id, 'CONTACTADO_EMAIL')}
        />
      )}

      {/* Lead Detail & Audit Modal */}
      {selectedLeadForDetail && (
        <LeadDetailModal
          lead={selectedLeadForDetail}
          onClose={() => setSelectedLeadForDetail(null)}
          onSaveNotes={handleSaveNotes}
          onLeadUpdated={(updatedLead) => {
            setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
            setSelectedLeadForDetail(updatedLead);
          }}
        />
      )}

      {/* Admin Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Initial Setup Wizard Modal (Only shown on first-ever run if no admin exists) */}
      {isSetupNeeded && (
        <SetupWizardModal
          onSetupSuccess={handleSetupSuccess}
        />
      )}
    </div>
  );
};

export default App;
