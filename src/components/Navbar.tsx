import React from 'react';
import { FileText, Users, Building, BarChart3, Trash2, LogOut, ListTodo } from 'lucide-react';
import { AppTab, BusinessProfile } from '../types';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  businessProfile: BusinessProfile;
  trashCount?: number;
  onQuickNewDocument: (type?: 'devis' | 'facture') => void;
  onLogout?: () => void;
  userName?: string;
}

const DESKTOP_TABS: {
  id: AppTab;
  label: string;
  short?: string;
  icon: React.ReactNode;
  danger?: boolean;
}[] = [
  { id: 'documents', label: 'Devis & Factures', short: 'Docs', icon: <FileText className="w-4 h-4" /> },
  { id: 'clients', label: 'Clients', icon: <Users className="w-4 h-4" /> },
  { id: 'todos', label: 'Todolist', short: 'Tâches', icon: <ListTodo className="w-4 h-4" /> },
  { id: 'analytics', label: 'Statistiques', short: 'Stats', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'settings', label: 'Profil', icon: <Building className="w-4 h-4" /> },
  { id: 'trash', label: 'Corbeille', icon: <Trash2 className="w-4 h-4" />, danger: true },
];

const MOBILE_TABS: {
  id: AppTab;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: 'documents', label: 'Docs', icon: <FileText className="w-5 h-5" /> },
  { id: 'clients', label: 'Clients', icon: <Users className="w-5 h-5" /> },
  { id: 'todos', label: 'Tâches', icon: <ListTodo className="w-5 h-5" /> },
  { id: 'analytics', label: 'Stats', icon: <BarChart3 className="w-5 h-5" /> },
  { id: 'settings', label: 'Profil', icon: <Building className="w-5 h-5" /> },
  { id: 'trash', label: 'Corbeille', icon: <Trash2 className="w-5 h-5" /> },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  businessProfile,
  trashCount = 0,
  onLogout,
  userName,
}) => {
  const displayName = businessProfile.companyName || 'Mon entreprise';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-40 px-2 sm:px-4 pt-2 sm:pt-3">
        <div className="glass-nav-shell max-w-7xl mx-auto">
          <div className="relative flex items-center justify-between gap-3 h-14 sm:h-[3.75rem] px-2.5 sm:px-3">
            {/* Brand */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pl-0.5">
              <div className="nav-brand-mark shrink-0" aria-hidden>
                <FileText className="w-[1.15rem] h-[1.15rem] relative z-10" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-extrabold text-[15px] sm:text-lg tracking-tight text-brand-paper truncate leading-none">
                    FacturaCFA
                  </span>
                  <span className="nav-fcfa-chip hidden sm:inline-flex">FCFA</span>
                </div>
                <p className="hidden sm:block text-[10px] text-brand-sand/50 font-medium truncate max-w-[200px] mt-0.5">
                  {displayName}
                  {userName ? ` · ${userName}` : ''}
                </p>
              </div>
            </div>

            {/* Desktop nav rail */}
            <nav
              className="hidden md:flex items-center gap-0.5 p-1 rounded-2xl bg-black/20 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              aria-label="Navigation principale"
            >
              {DESKTOP_TABS.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`nav-rail-btn ${active ? (tab.danger ? 'is-active-danger' : 'is-active') : ''} ${
                      tab.danger && !active ? 'is-danger' : ''
                    }`}
                  >
                    <span className="nav-rail-icon">{tab.icon}</span>
                    <span className="hidden lg:inline">{tab.label}</span>
                    <span className="lg:hidden">{tab.short || tab.label}</span>
                    {tab.id === 'trash' && trashCount > 0 && (
                      <span className="nav-badge">{trashCount > 9 ? '9+' : trashCount}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Account */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="hidden lg:flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-2xl bg-white/[0.04] border border-white/10">
                <div className="nav-avatar" aria-hidden>
                  {initial}
                </div>
                <div className="text-left text-xs min-w-0">
                  <div className="font-semibold text-brand-paper leading-tight truncate max-w-[140px]">
                    {displayName}
                  </div>
                  <div className="text-[10px] text-brand-sand/45 font-medium truncate max-w-[140px]">
                    {userName || 'Profil entreprise'}
                  </div>
                </div>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="nav-logout-btn"
                  title="Se déconnecter"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Quitter</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile dock */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 pointer-events-none"
        aria-label="Navigation mobile"
      >
        <div className="glass-nav-dock pointer-events-auto mx-auto max-w-lg">
          <div className="grid grid-cols-6 h-[3.85rem]">
            {MOBILE_TABS.map((tab) => {
              const active = activeTab === tab.id;
              const danger = tab.id === 'trash';
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`nav-dock-btn ${active ? (danger ? 'is-active-danger' : 'is-active') : ''}`}
                >
                  <span className="nav-dock-icon-wrap">
                    {tab.icon}
                    {tab.id === 'trash' && trashCount > 0 && (
                      <span className="nav-badge nav-badge-dock">
                        {trashCount > 9 ? '9+' : trashCount}
                      </span>
                    )}
                  </span>
                  <span className="nav-dock-label">{tab.label}</span>
                  {active && <span className="nav-dock-indicator" aria-hidden />}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
};
