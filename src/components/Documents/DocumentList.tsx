import React, { useState } from 'react';
import { Search, Calendar, Filter, Plus, FileText, CheckCircle2, Clock, AlertTriangle, XCircle, ArrowUpRight, Copy, Edit3, Trash2, Eye, RefreshCw, DollarSign, Tag, ChevronDown } from 'lucide-react';
import { DateRangeFilter, DocumentStatus, DocumentType, InvoiceDocument, TodoItem } from '../../types';
import { formatFCFA, calculateDocumentTotals } from '../../utils/currency';
import { computeFinancialMetrics } from '../../utils/analytics';
import { getStatusInfo, ALL_STATUSES } from '../../utils/status';
import { formatDateFR, toISODate } from '../../utils/date';
import { FrenchDateInput } from '../ui/FrenchDateInput';
import { BamakoWelcome } from '../Dashboard/BamakoWelcome';
import { NewsCard } from '../Dashboard/NewsCard';
import { UpcomingTodosCard } from '../Dashboard/UpcomingTodosCard';

interface DocumentListProps {
  documents: InvoiceDocument[];
  onNewDocument: (type: DocumentType) => void;
  onEditDocument: (doc: InvoiceDocument) => void;
  onViewDocument: (doc: InvoiceDocument) => void;
  onDuplicateDocument: (doc: InvoiceDocument) => void;
  onConvertDevisToFacture: (doc: InvoiceDocument) => void;
  onUpdateStatus: (id: string, status: DocumentStatus) => void;
  onDeleteDocument: (id: string) => void;
  userName?: string;
  todos?: TodoItem[];
  onOpenTodos?: () => void;
  onToggleTodo?: (id: string, done: boolean) => Promise<void> | void;
}

// Interactive Status Selector Component inside the table
const StatusSelector: React.FC<{
  currentStatus: string;
  docId: string;
  onUpdateStatus: (id: string, status: DocumentStatus) => void;
}> = ({ currentStatus, docId, onUpdateStatus }) => {
  const [isCustom, setIsCustom] = useState(false);
  const [customVal, setCustomVal] = useState('');

  const statusInfo = getStatusInfo(currentStatus);
  const IconComponent = statusInfo.icon;

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__CUSTOM__') {
      setIsCustom(true);
      return;
    }
    onUpdateStatus(docId, val);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customVal.trim()) {
      onUpdateStatus(docId, customVal.trim());
      setIsCustom(false);
      setCustomVal('');
    }
  };

  if (isCustom) {
    return (
      <form onSubmit={handleCustomSubmit} className="flex items-center gap-1">
        <input
          type="text"
          autoFocus
          placeholder="Entrez statut..."
          value={customVal}
          onChange={(e) => setCustomVal(e.target.value)}
          className="px-2 py-1 bg-white border border-blue-500 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-mid w-32 shadow-xs"
        />
        <button
          type="submit"
          className="px-2 py-1 bg-brand-ink text-white rounded-lg text-[10px] font-bold cursor-pointer hover:bg-brand-deep"
        >
          Valider
        </button>
        <button
          type="button"
          onClick={() => setIsCustom(false)}
          className="px-1.5 py-1 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
        >
          ✕
        </button>
      </form>
    );
  }

  return (
    <div className="relative inline-flex items-center group">
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer ${statusInfo.bgClass}`}
      >
        <IconComponent className="w-3.5 h-3.5 shrink-0" />
        <select
          value={ALL_STATUSES[currentStatus] ? currentStatus : '__CUSTOM_DISPLAY__'}
          onChange={handleSelectChange}
          className="bg-transparent font-bold cursor-pointer focus:outline-none appearance-none pr-3 text-xs text-inherit"
          style={{ backgroundImage: 'none', color: 'inherit' }}
          title="Cliquer pour changer le statut"
        >
          {!ALL_STATUSES[currentStatus] && (
            <option value="__CUSTOM_DISPLAY__">{currentStatus}</option>
          )}
          <optgroup label="Facturation & Règlement">
            <option value="payee">Payé</option>
            <option value="en_attente_paiement">En attente de paiement</option>
            <option value="en_attente">En attente</option>
            <option value="en_retard">En retard</option>
          </optgroup>
          <optgroup label="Suivi Commande & Pose">
            <option value="commande">Commandé</option>
            <option value="en_cours">En fabrication / En cours</option>
            <option value="pose">Posé / Installé</option>
            <option value="livre">Livré</option>
          </optgroup>
          <optgroup label="Devis & Validation">
            <option value="accepte">Accepté</option>
            <option value="refuse">Refusé</option>
            <option value="brouillon">Brouillon</option>
            <option value="converti">Converti en facture</option>
            <option value="annulee">Annulée</option>
          </optgroup>
          <option value="__CUSTOM__">+ Autre statut personnalisé...</option>
        </select>
        <ChevronDown className="w-3 h-3 opacity-60 shrink-0 pointer-events-none -ml-2" />
      </div>
    </div>
  );
};

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onNewDocument,
  onEditDocument,
  onViewDocument,
  onDuplicateDocument,
  onConvertDevisToFacture,
  onUpdateStatus,
  onDeleteDocument,
  userName,
  todos = [],
  onOpenTodos,
  onToggleTodo,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<'all' | 'devis' | 'facture'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [documentToDelete, setDocumentToDelete] = useState<InvoiceDocument | null>(null);

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>({
    startDate: '',
    endDate: '',
    preset: 'all',
  });

  const handlePresetDate = (preset: DateRangeFilter['preset']) => {
    const today = new Date();
    let startDate = '';
    let endDate = '';

    if (preset === 'this_month') {
      startDate = toISODate(new Date(today.getFullYear(), today.getMonth(), 1));
      endDate = toISODate(today);
    } else if (preset === 'last_month') {
      startDate = toISODate(new Date(today.getFullYear(), today.getMonth() - 1, 1));
      endDate = toISODate(new Date(today.getFullYear(), today.getMonth(), 0));
    } else if (preset === 'this_year') {
      startDate = toISODate(new Date(today.getFullYear(), 0, 1));
      endDate = toISODate(today);
    }

    setDateFilter({
      startDate,
      endDate,
      preset,
    });
  };

  // Filter Documents by Date, Search, Type and Status
  const filteredDocuments = documents.filter((doc) => {
    // Type Filter
    if (docTypeFilter !== 'all' && doc.type !== docTypeFilter) {
      return false;
    }

    // Status Filter
    if (statusFilter !== 'all' && doc.status !== statusFilter) {
      return false;
    }

    // Search Term Filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchNumber = doc.number.toLowerCase().includes(term);
      const matchClient = doc.clientInfo.name.toLowerCase().includes(term) || (doc.clientInfo.companyName && doc.clientInfo.companyName.toLowerCase().includes(term));
      const matchItem = doc.items.some((it) => it.description.toLowerCase().includes(term));
      const matchStatus = doc.status.toLowerCase().includes(term);
      if (!matchNumber && !matchClient && !matchItem && !matchStatus) {
        return false;
      }
    }

    // Date Range Filter
    if (dateFilter.startDate) {
      if (doc.date < dateFilter.startDate) return false;
    }
    if (dateFilter.endDate) {
      if (doc.date > dateFilter.endDate) return false;
    }

    return true;
  });

  // Mêmes règles que le dashboard Stats (source unique)
  const metrics = computeFinancialMetrics(documents);

  const getStatusBadge = (status: DocumentStatus, _type: DocumentType) => {
    const info = getStatusInfo(status);
    const Icon = info.icon;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${info.bgClass}`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{info.label}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <BamakoWelcome userName={userName} />

      <NewsCard />

      {onOpenTodos && (
        <UpcomingTodosCard
          todos={todos}
          onOpenTodos={onOpenTodos}
          onToggle={onToggleTodo}
        />
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="hover-lift glass-card kpi-card p-5 pl-6 flex items-center justify-between cursor-default">
          <div>
            <span className="page-kicker">Encaissé</span>
            <div className="kpi-figure text-2xl text-brand-sand mt-1.5">{formatFCFA(metrics.totalPaid)}</div>
            <p className="text-[11px] text-slate-500 mt-1">Factures réglées</p>
          </div>
          <div className="icon-well">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="hover-lift glass-card kpi-card kpi-card-amber p-5 pl-6 flex items-center justify-between cursor-default">
          <div>
            <span className="page-kicker !text-amber-300">À encaisser</span>
            <div className="kpi-figure text-2xl text-amber-300 mt-1.5">{formatFCFA(metrics.totalPending)}</div>
            <p className="text-[11px] text-slate-500 mt-1">Factures en attente</p>
          </div>
          <div className="icon-well icon-well-amber">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="hover-lift glass-card kpi-card p-5 pl-6 flex items-center justify-between cursor-default">
          <div>
            <span className="page-kicker">Devis en cours</span>
            <div className="kpi-figure text-2xl text-brand-sand mt-1.5">{formatFCFA(metrics.totalDevisPipeline)}</div>
            <p className="text-[11px] text-slate-500 mt-1">En attente & acceptés</p>
          </div>
          <div className="icon-well">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Filter & Search Section */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="glass-segment">
              <button
                type="button"
                onClick={() => setDocTypeFilter('all')}
                className={`glass-segment-btn ${docTypeFilter === 'all' ? 'is-active' : ''}`}
              >
                Tous ({documents.length})
              </button>
              <button
                type="button"
                onClick={() => setDocTypeFilter('facture')}
                className={`glass-segment-btn ${docTypeFilter === 'facture' ? 'is-active' : ''}`}
              >
                Factures ({documents.filter((d) => d.type === 'facture').length})
              </button>
              <button
                type="button"
                onClick={() => setDocTypeFilter('devis')}
                className={`glass-segment-btn ${docTypeFilter === 'devis' ? 'is-active' : ''}`}
              >
                Devis ({documents.filter((d) => d.type === 'devis').length})
              </button>
            </div>

            <div className="flex items-center gap-1.5 glass-input px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent font-bold text-xs text-slate-700 cursor-pointer focus:outline-none"
              >
                <option value="all">Tous les statuts</option>
                <option value="payee">Payé</option>
                <option value="en_attente_paiement">En attente de paiement</option>
                <option value="en_attente">En attente</option>
                <option value="commande">Commandé</option>
                <option value="en_cours">En fabrication / En cours</option>
                <option value="pose">Posé / Installé</option>
                <option value="livre">Livré</option>
                <option value="accepte">Accepté</option>
                <option value="refuse">Refusé</option>
                <option value="en_retard">En retard</option>
                <option value="brouillon">Brouillon</option>
                <option value="annulee">Annulée</option>
                <option value="converti">Converti en facture</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => onNewDocument('devis')}
              className="hover-press app-btn-secondary px-3.5 py-2.5 sm:py-2 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Devis</span>
            </button>

            <button
              type="button"
              onClick={() => onNewDocument('facture')}
              className="hover-press app-btn-primary px-4 py-2.5 sm:py-2 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Facture</span>
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-white/40 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par N°, nom client ou désignation..."
              className="glass-input w-full pl-9 pr-3 py-2.5 text-slate-800 text-xs"
            />
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <div className="relative flex-1">
              <FrenchDateInput
                value={dateFilter.startDate}
                onChange={(startDate) => setDateFilter((prev) => ({ ...prev, startDate, preset: 'custom' }))}
                className="glass-input w-full px-2.5 py-2.5 pr-9 text-slate-800 text-xs"
                title="Date début (JJ/MM/AAAA)"
              />
            </div>
            <span className="text-xs text-slate-400 font-bold">à</span>
            <div className="relative flex-1">
              <FrenchDateInput
                value={dateFilter.endDate}
                onChange={(endDate) => setDateFilter((prev) => ({ ...prev, endDate, preset: 'custom' }))}
                className="glass-input w-full px-2.5 py-2.5 pr-9 text-slate-800 text-xs"
                title="Date fin (JJ/MM/AAAA)"
              />
            </div>
          </div>

          <div className="md:col-span-3 flex items-center justify-end">
            <div className="glass-segment">
              <button
                type="button"
                onClick={() => handlePresetDate('all')}
                className={`glass-segment-btn !px-2.5 !py-1.5 !text-[11px] ${dateFilter.preset === 'all' ? 'is-active' : ''}`}
              >
                Tout
              </button>
              <button
                type="button"
                onClick={() => handlePresetDate('this_month')}
                className={`glass-segment-btn !px-2.5 !py-1.5 !text-[11px] ${dateFilter.preset === 'this_month' ? 'is-active' : ''}`}
              >
                Ce mois
              </button>
              <button
                type="button"
                onClick={() => handlePresetDate('this_year')}
                className={`glass-segment-btn !px-2.5 !py-1.5 !text-[11px] ${dateFilter.preset === 'this_year' ? 'is-active' : ''}`}
              >
                Cette année
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Documents — cartes mobile / tableau desktop */}
      <div className="glass-card overflow-hidden">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12 p-6">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">Aucun document trouvé</h3>
            <p className="text-xs text-slate-400 mt-1">
              Aucune facture ni devis ne correspond à vos critères de recherche par date ou filtre.
            </p>
          </div>
        ) : (
          <>
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredDocuments.map((doc) => {
              const totals = calculateDocumentTotals(doc.items, doc.taxRate);
              const isDevis = doc.type === 'devis';
              return (
                <div key={doc.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${
                            isDevis
                              ? 'bg-sky-500/20 text-sky-200 border-sky-400/40'
                              : 'bg-brand-glow/15 text-brand-glow border-brand-glow/30'
                          }`}
                        >
                          {isDevis ? 'DEVIS' : 'FAC'}
                        </span>
                        <span className="font-mono font-bold text-brand-sand text-xs">{doc.number}</span>
                      </div>
                      <div className="mt-1 font-semibold text-brand-sand text-sm truncate">
                        {doc.clientInfo.companyName || doc.clientInfo.name}
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        {formatDateFR(doc.date)}
                        {doc.dueDate ? ` · Éch. ${formatDateFR(doc.dueDate)}` : ''}
                      </div>
                      {isDevis ? (
                        (() => {
                          const attachedFactureNum = doc.convertedFactureNumber || documents.find(d => d.type === 'facture' && (d.sourceDevisId === doc.id || (d.sourceDevisNumber && d.sourceDevisNumber === doc.number)))?.number;
                          if (!attachedFactureNum) return null;
                          const attachedFactureDoc = documents.find(d => d.type === 'facture' && d.number === attachedFactureNum);
                          return (
                            <button
                              type="button"
                              onClick={() => attachedFactureDoc && onViewDocument(attachedFactureDoc)}
                              className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-sky-100 bg-sky-500/20 hover:bg-sky-500/30 px-2 py-0.5 rounded-md border border-sky-400/40 w-fit transition-all cursor-pointer group"
                              title="Cliquer pour voir la facture rattachée"
                            >
                              <span className="text-[9px] text-sky-200 font-bold uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5 text-sky-200" />
                                Facture :
                              </span>
                              <span className="font-mono font-bold text-sky-100 group-hover:underline">{attachedFactureNum}</span>
                            </button>
                          );
                        })()
                      ) : (
                        (() => {
                          const refDevis = doc.sourceDevisNumber || (doc.notes?.match(/devis\s*(?:n[°o]?\s*)?([A-Za-z0-9_-]+)/i)?.[1]);
                          if (!refDevis) return null;
                          const attachedDevisDoc = documents.find(d => d.type === 'devis' && (d.id === doc.sourceDevisId || d.number === refDevis));
                          return (
                            <button
                              type="button"
                              onClick={() => attachedDevisDoc && onViewDocument(attachedDevisDoc)}
                              className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-violet-100 bg-violet-500/20 hover:bg-violet-500/30 px-2 py-0.5 rounded-md border border-violet-400/40 w-fit transition-all cursor-pointer group"
                              title="Cliquer pour voir le devis d'origine"
                            >
                              <span className="text-[9px] text-violet-200 font-bold uppercase tracking-wider flex items-center gap-1">
                                <FileText className="w-2.5 h-2.5 text-violet-200" />
                                Devis d'origine :
                              </span>
                              <span className="font-mono font-bold text-violet-100 group-hover:underline">{refDevis}</span>
                            </button>
                          );
                        })()
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="kpi-figure font-mono font-black text-brand-sand text-sm">
                        {formatFCFA(totals.totalTTC, doc.currency)}
                      </div>
                    </div>
                  </div>

                  <StatusSelector docId={doc.id} currentStatus={doc.status} onUpdateStatus={onUpdateStatus} />

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onViewDocument(doc)}
                      className="py-2.5 px-3 app-btn-primary text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      Aperçu
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditDocument(doc)}
                      className="py-2.5 px-3 app-btn-secondary text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                      Modifier
                    </button>
                    {isDevis && doc.status !== 'converti' && (
                      <button
                        type="button"
                        onClick={() => onConvertDevisToFacture(doc)}
                        className="py-2.5 px-3 bg-fuchsia-500/20 text-fuchsia-100 border border-fuchsia-400/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer col-span-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Convertir en facture
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDuplicateDocument(doc)}
                      className="py-2.5 px-3 bg-white/8 text-brand-sand border border-white/15 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                      Dupliquer
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocumentToDelete(doc)}
                      className="py-2.5 px-3 bg-rose-500/20 text-rose-100 border border-rose-400/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Date / Échéance</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Montant TTC</th>
                  <th className="py-3 px-4 text-center w-36">Opérations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredDocuments.map((doc) => {
                  const totals = calculateDocumentTotals(doc.items, doc.taxRate);
                  const isDevis = doc.type === 'devis';

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Number & Type */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${
                              isDevis
                                ? 'bg-sky-500/20 text-sky-200 border-sky-400/40'
                                : 'bg-brand-glow/15 text-brand-glow border-brand-glow/30'
                            }`}
                          >
                            {isDevis ? 'DEVIS' : 'FAC'}
                          </span>
                          <span className="font-mono font-bold text-brand-sand text-xs">{doc.number}</span>
                        </div>
                        {/* Source devis or Converted Facture reference badge */}
                        {isDevis ? (
                          (() => {
                            const attachedFactureNum = doc.convertedFactureNumber || documents.find(d => d.type === 'facture' && (d.sourceDevisId === doc.id || (d.sourceDevisNumber && d.sourceDevisNumber === doc.number)))?.number;
                            if (!attachedFactureNum) return null;
                            const attachedFactureDoc = documents.find(d => d.type === 'facture' && d.number === attachedFactureNum);
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  if (attachedFactureDoc) {
                                    e.stopPropagation();
                                    onViewDocument(attachedFactureDoc);
                                  }
                                }}
                                className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-sky-100 bg-sky-500/20 hover:bg-sky-500/30 px-2 py-0.5 rounded-md border border-sky-400/40 w-fit transition-all cursor-pointer group"
                                title="Cliquer pour voir la facture rattachée"
                              >
                                <span className="text-[9px] text-sky-200 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-sky-200" />
                                  Facture :
                                </span>
                                <span className="font-mono font-bold text-sky-100 group-hover:underline">{attachedFactureNum}</span>
                              </button>
                            );
                          })()
                        ) : (
                          (() => {
                            const refDevis = doc.sourceDevisNumber || (doc.notes?.match(/devis\s*(?:n[°o]?\s*)?([A-Za-z0-9_-]+)/i)?.[1]);
                            if (!refDevis) return null;
                            const attachedDevisDoc = documents.find(d => d.type === 'devis' && (d.id === doc.sourceDevisId || d.number === refDevis));
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  if (attachedDevisDoc) {
                                    e.stopPropagation();
                                    onViewDocument(attachedDevisDoc);
                                  }
                                }}
                                className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-violet-100 bg-violet-500/20 hover:bg-violet-500/30 px-2 py-0.5 rounded-md border border-violet-400/40 w-fit transition-all cursor-pointer group"
                                title="Cliquer pour voir le devis d'origine"
                              >
                                <span className="text-[9px] text-violet-200 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <FileText className="w-2.5 h-2.5 text-violet-200" />
                                  Devis d'origine :
                                </span>
                                <span className="font-mono font-bold text-violet-100 group-hover:underline">{refDevis}</span>
                              </button>
                            );
                          })()
                        )}
                      </td>

                      {/* Client Name */}
                      <td className="py-3.5 px-4 font-medium text-slate-200">
                        <div className="font-semibold text-brand-sand">{doc.clientInfo.companyName || doc.clientInfo.name}</div>
                        {doc.clientInfo.companyName && (
                          <div className="text-[11px] text-slate-300">{doc.clientInfo.name}</div>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-4 text-slate-300">
                        <div>{formatDateFR(doc.date)}</div>
                        <div className="text-[10px] text-slate-400">Éch : {formatDateFR(doc.dueDate)}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusSelector docId={doc.id} currentStatus={doc.status} onUpdateStatus={onUpdateStatus} />
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right kpi-figure font-mono font-bold text-brand-sand text-sm">
                        {formatFCFA(totals.totalTTC, doc.currency)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* View PDF */}
                          <button
                            onClick={() => onViewDocument(doc)}
                            title="Aperçu & Imprimer PDF"
                            className="p-1.5 text-slate-500 hover:text-brand-mid hover:bg-brand-mist rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => onEditDocument(doc)}
                            title="Modifier"
                            className="p-1.5 text-slate-500 hover:text-brand-mid hover:bg-brand-mist rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Convert Devis to Facture if Devis */}
                          {isDevis && doc.status !== 'converti' && (
                            <button
                              onClick={() => onConvertDevisToFacture(doc)}
                              title="Convertir ce devis en Facture"
                              className="px-2 py-1 bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-100 border border-fuchsia-400/40 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-fuchsia-200" />
                              <span className="hidden md:inline">En Facture</span>
                            </button>
                          )}

                          {/* Duplicate */}
                          <button
                            onClick={() => onDuplicateDocument(doc)}
                            title="Dupliquer ce document"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDocumentToDelete(doc)}
                            title="Supprimer ce document"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {documentToDelete && (
        <div className="fixed inset-0 bg-brand-ink/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-card max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Supprimer le document</h3>
                <p className="text-xs text-slate-500 font-medium">Confirmation requise</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed mb-6">
              Êtes-vous sûr de vouloir supprimer le document{' '}
              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {documentToDelete.number}
              </span>{' '}
              ({documentToDelete.type === 'devis' ? 'Devis' : 'Facture'}) ? Il sera placé dans la Corbeille où vous pourrez le restaurer à tout moment.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDocumentToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteDocument(documentToDelete.id);
                  setDocumentToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Oui, Supprimer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
