import React from 'react';
import { FileText, Users, Building, BarChart3, Trash2, LogOut } from 'lucide-react';
import { BusinessProfile } from '../types';
import { ThemeToggle } from './Common/ThemeToggle';

interface NavbarProps {
  activeTab: 'documents' | 'clients' | 'analytics' | 'settings' | 'trash';
  setActiveTab: (tab: 'documents' | 'clients' | 'analytics' | 'settings' | 'trash') => void;
  businessProfile: BusinessProfile;
  trashCount?: number;
  onQuickNewDocument: (type?: 'devis' | 'facture') => void;
  onLogout?: () => void;
  userName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  businessProfile,
  trashCount = 0,
  onLogout,
  userName,
}) => {
  const displayName = businessProfile.companyName || 'Mon entreprise';

  const mobileTabs: {
    id: typeof activeTab;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { id: 'documents', label: 'Documents', icon: <FileText className="w-5 h-5" /> },
    { id: 'clients', label: 'Clients', icon: <Users className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analyse', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'settings', label: 'Profil', icon: <Building className="w-5 h-5" /> },
    { id: 'trash', label: 'Corbeille', icon: <Trash2 className="w-5 h-5" /> },
  ];

  const navBtn = (id: typeof activeTab, label: string, icon: React.ReactNode, danger = false) => {
    const active = activeTab === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => setActiveTab(id)}
        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
          active
            ? danger
              ? 'bg-rose-600 text-white scale-[1.03]'
              : 'bg-brand-mid text-white scale-[1.03] shadow-md shadow-brand-glow/20'
            : danger
              ? 'text-slate-300 hover:text-rose-300 hover:bg-white/5 hover:scale-[1.03]'
              : 'text-slate-300 hover:text-white hover:bg-white/5 hover:scale-[1.03]'
        }`}
      >
        {icon}
        <span>{label}</span>
        {id === 'trash' && trashCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-bold leading-none">
            {trashCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-brand-ink text-brand-paper border-b border-brand-deep/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-brand-mid/30 text-brand-glow flex items-center justify-center border border-brand-glow/25">
                <FileText className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-extrabold text-base sm:text-lg tracking-tight text-brand-paper truncate">
                    FacturaCFA
                  </span>
                  <span className="hidden sm:inline px-2 py-0.5 rounded-md bg-brand-mid/25 border border-brand-glow/20 text-brand-glow text-[10px] font-bold uppercase tracking-wider">
                    FCFA
                  </span>
                </div>
                <p className="hidden sm:block text-[10px] text-brand-sand/55 font-medium truncate max-w-[240px]">
                  {displayName}
                  {userName ? ` · ${userName}` : ''}
                </p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-0.5 bg-brand-deep/50 p-1 rounded-xl border border-white/8">
              {navBtn('documents', 'Devis & Factures', <FileText className="w-4 h-4" />)}
              {navBtn('clients', 'Clients', <Users className="w-4 h-4" />)}
              {navBtn('analytics', 'Statistiques', <BarChart3 className="w-4 h-4" />)}
              {navBtn('settings', 'Profil', <Building className="w-4 h-4" />)}
              {navBtn('trash', 'Corbeille', <Trash2 className="w-4 h-4" />, true)}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <div className="hidden lg:flex items-center gap-2 pr-2 border-r border-white/10">
                <div className="w-8 h-8 rounded-lg bg-brand-mid/25 text-brand-glow flex items-center justify-center font-bold text-xs border border-brand-glow/20">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="text-left text-xs">
                  <div className="font-semibold text-brand-paper leading-tight truncate max-w-[160px]">
                    {displayName}
                  </div>
                  <div className="text-[10px] text-brand-sand/50 font-medium truncate max-w-[160px]">
                    {userName || 'Profil Entreprise'}
                  </div>
                </div>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold text-brand-sand/70 hover:text-brand-paper hover:bg-white/8 border border-white/10 flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Se déconnecter"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-brand-ink/95 backdrop-blur-md border-t border-brand-deep pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16">
          {mobileTabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold cursor-pointer transition-colors ${
                  active
                    ? tab.id === 'trash'
                      ? 'text-rose-400'
                      : 'text-brand-glow'
                    : 'text-brand-sand/40'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.id === 'trash' && trashCount > 0 && (
                  <span className="absolute top-1.5 right-[calc(50%-18px)] min-w-[16px] h-4 px-1 rounded-md bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {trashCount > 9 ? '9+' : trashCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
