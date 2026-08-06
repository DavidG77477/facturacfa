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
  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 text-white flex items-center justify-center font-black shadow-md shadow-blue-900/40">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-400 bg-clip-text text-transparent">
                  FacturaCFA
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-extrabold uppercase tracking-wider">
                  FCFA / XOF / XAF
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Devis, Factures & PDF pour l'Afrique</p>
            </div>
          </div>

          {/* Navigation Links */}
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

          {/* Right Action & User Controls */}
          <div className="flex items-center gap-3">
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
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                title="Se déconnecter"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold ${
              activeTab === 'documents' ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Documents</span>
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold ${
              activeTab === 'clients' ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clients</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold ${
              activeTab === 'analytics' ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Stats</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold ${
              activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Profil</span>
          </button>
          <button
            onClick={() => setActiveTab('trash')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold relative ${
              activeTab === 'trash' ? 'bg-rose-600 text-white' : 'text-slate-400'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Corbeille</span>
            {trashCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                {trashCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
