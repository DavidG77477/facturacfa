import React from 'react';
import { FileText, Users, Building, BarChart3, Trash2, LogOut } from 'lucide-react';
import { BusinessProfile } from '../types';

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
    activeClass: string;
  }[] = [
    {
      id: 'documents',
      label: 'Docs',
      icon: <FileText className="w-5 h-5" />,
      activeClass: 'text-blue-400',
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: <Users className="w-5 h-5" />,
      activeClass: 'text-blue-400',
    },
    {
      id: 'analytics',
      label: 'Stats',
      icon: <BarChart3 className="w-5 h-5" />,
      activeClass: 'text-blue-400',
    },
    {
      id: 'settings',
      label: 'Profil',
      icon: <Building className="w-5 h-5" />,
      activeClass: 'text-blue-400',
    },
    {
      id: 'trash',
      label: 'Corbeille',
      icon: <Trash2 className="w-5 h-5" />,
      activeClass: 'text-rose-400',
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 text-white flex items-center justify-center font-black shadow-md shadow-blue-900/40">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight truncate bg-gradient-to-r from-white via-slate-100 to-blue-400 bg-clip-text text-transparent">
                    FacturaCFA
                  </span>
                  <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-extrabold uppercase tracking-wider">
                    FCFA / XOF / XAF
                  </span>
                </div>
                <p className="hidden sm:block text-[10px] text-slate-400 font-medium truncate max-w-[220px]">
                  {displayName}
                  {userName ? ` · ${userName}` : ''}
                </p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60">
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'documents'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Devis & Factures</span>
              </button>

              <button
                onClick={() => setActiveTab('clients')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'clients'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Clients</span>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'analytics'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'settings'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Profil Entreprise</span>
              </button>

              <button
                onClick={() => setActiveTab('trash')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'trash'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-rose-300 hover:bg-slate-700/50'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>Corbeille</span>
                {trashCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                    {trashCount}
                  </span>
                )}
              </button>
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden lg:flex items-center gap-2 pr-2 border-r border-slate-800">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs border border-blue-500/30">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="text-left text-xs">
                  <div className="font-bold text-slate-200 leading-tight truncate max-w-[160px]">
                    {displayName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium truncate max-w-[160px]">
                    {userName || 'Profil Entreprise'}
                  </div>
                </div>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
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

      {/* Bottom tab bar — mobile only */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur border-t border-slate-800 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 h-16">
          {mobileTabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold cursor-pointer transition-colors ${
                  active ? tab.activeClass : 'text-slate-500'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.id === 'trash' && trashCount > 0 && (
                  <span className="absolute top-1.5 right-[calc(50%-18px)] min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
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
