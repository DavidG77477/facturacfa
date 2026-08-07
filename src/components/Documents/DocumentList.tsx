import React, { useState } from 'react';
import { Search, Calendar, Filter, Plus, FileText, CheckCircle2, Clock, AlertTriangle, XCircle, ArrowUpRight, Copy, Edit3, Trash2, Eye, RefreshCw, DollarSign, Tag, ChevronDown } from 'lucide-react';
import { DateRangeFilter, DocumentStatus, DocumentType, InvoiceDocument } from '../../types';
import { formatFCFA, calculateDocumentTotals } from '../../utils/currency';
import { computeFinancialMetrics } from '../../utils/analytics';
import { getStatusInfo, ALL_STATUSES } from '../../utils/status';
import { formatDateFR, toISODate } from '../../utils/date';
import { FrenchDateInput } from '../ui/FrenchDateInput';
import { BamakoWelcome } from '../Dashboard/BamakoWelcome';

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
          className="bg-transparent font-bold cursor-pointer focus:outline-none appearance-none pr-3 text-xs"
          style={{ backgroundImage: 'none' }}
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

  const getStatusBadge = (status: DocumentStatus, type: DocumentType) => {
    switch (status) {
      case 'payee':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-mist text-brand-ink border border-brand-mid/25 rounded-lg text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Payée</span>
          </span>
        );
      case 'en_attente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>En attente</span>
          </span>
        );
      case 'en_retard':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>En retard</span>
          </span>
        );
      case 'accepte':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-mist text-brand-ink border border-brand-mid/25 rounded-lg text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Accepté</span>
          </span>
        );
      case 'refuse':
      case 'annulee':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold">
            <XCircle className="w-3.5 h-3.5" />
            <span>{status === 'refuse' ? 'Refusé' : 'Annulée'}</span>
          </span>
        );
      case 'converti':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Converti en Facture</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <BamakoWelcome userName={userName} />

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="hover-lift bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between cursor-default">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Chiffre d'Affaires Réglé</span>
            <div className="kpi-figure text-2xl text-brand-ink mt-1">{formatFCFA(metrics.totalPaid)}</div>
            <p className="text-[11px] text-slate-600 mt-0.5">Factures encaissées</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-mist text-brand-mid flex items-center justify-center font-bold transition-transform duration-300 group-hover:scale-110">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="hover-lift bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between cursor-default">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">En Attente de Règlement</span>
            <div className="kpi-figure text-2xl text-amber-600 mt-1">{formatFCFA(metrics.totalPending)}</div>
            <p className="text-[11px] text-slate-600 mt-0.5">Factures émises non payées</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="hover-lift bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between cursor-default">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Encours Devis</span>
            <div className="kpi-figure text-2xl text-brand-ink mt-1">{formatFCFA(metrics.totalDevisPipeline)}</div>
            <p className="text-[11px] text-slate-600 mt-0.5">Devis en attente & acceptés</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-mist text-brand-mid flex items-center justify-center font-bold">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Filter & Search Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Top bar: Type Filter Tabs, Status Filter & Action Buttons */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setDocTypeFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  docTypeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tous ({documents.length})
              </button>
              <button
                onClick={() => setDocTypeFilter('facture')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  docTypeFilter === 'facture' ? 'bg-brand-ink text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Factures ({documents.filter((d) => d.type === 'facture').length})
              </button>
              <button
                onClick={() => setDocTypeFilter('devis')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  docTypeFilter === 'devis' ? 'bg-brand-ink text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Devis ({documents.filter((d) => d.type === 'devis').length})
              </button>
            </div>

            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
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
              onClick={() => onNewDocument('devis')}
              className="hover-press px-3.5 py-2.5 sm:py-2 bg-brand-mist hover:bg-brand-mist text-brand-ink font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Devis</span>
            </button>

            <button
              onClick={() => onNewDocument('facture')}
              className="hover-press px-4 py-2.5 sm:py-2 bg-brand-ink hover:bg-brand-deep text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Facture</span>
            </button>
          </div>
        </div>

        {/* Date Search & Preset Bar */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Keyword Search */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par N°, nom client ou désignation..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-mid"
            />
          </div>

          {/* Date Range Selector */}
          <div className="md:col-span-4 flex items-center gap-2">
            <div className="relative flex-1">
              <FrenchDateInput
                value={dateFilter.startDate}
                onChange={(startDate) => setDateFilter((prev) => ({ ...prev, startDate, preset: 'custom' }))}
                className="w-full px-2.5 py-2 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-mid"
                title="Date début (JJ/MM/AAAA)"
              />
            </div>
            <span className="text-xs text-slate-400 font-bold">à</span>
            <div className="relative flex-1">
              <FrenchDateInput
                value={dateFilter.endDate}
                onChange={(endDate) => setDateFilter((prev) => ({ ...prev, endDate, preset: 'custom' }))}
                className="w-full px-2.5 py-2 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-mid"
                title="Date fin (JJ/MM/AAAA)"
              />
            </div>
          </div>

          {/* Date Presets */}
          <div className="md:col-span-3 flex items-center justify-end gap-1">
            <button
              onClick={() => handlePresetDate('all')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                dateFilter.preset === 'all' ? 'bg-brand-deep text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tout
            </button>
            <button
              onClick={() => handlePresetDate('this_month')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                dateFilter.preset === 'this_month' ? 'bg-brand-deep text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Ce mois
            </button>
            <button
              onClick={() => handlePresetDate('this_year')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                dateFilter.preset === 'this_year' ? 'bg-brand-deep text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Cette année
            </button>
          </div>
        </div>
      </div>

      {/* Documents — cartes mobile / tableau desktop */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
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
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          isDevis ? 'bg-sky-100 text-sky-800' : 'bg-brand-mist text-brand-ink'
                        }`}>
                          {isDevis ? 'DEVIS' : 'FAC'}
                        </span>
                        <span className="font-mono font-bold text-slate-900 text-xs">{doc.number}</span>
                      </div>
                      <div className="mt-1 font-semibold text-slate-900 text-sm truncate">
                        {doc.clientInfo.companyName || doc.clientInfo.name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {formatDateFR(doc.date)}
                        {doc.dueDate ? ` · Éch. ${formatDateFR(doc.dueDate)}` : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-black text-slate-900 text-sm">
                        {formatFCFA(totals.totalTTC, doc.currency)}
                      </div>
                    </div>
                  </div>

                  <StatusSelector docId={doc.id} currentStatus={doc.status} onUpdateStatus={onUpdateStatus} />

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onViewDocument(doc)}
                      className="py-2.5 px-3 bg-brand-ink text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      Aperçu
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditDocument(doc)}
                      className="py-2.5 px-3 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                      Modifier
                    </button>
                    {isDevis && doc.status !== 'converti' && (
                      <button
                        type="button"
                        onClick={() => onConvertDevisToFacture(doc)}
                        className="py-2.5 px-3 bg-purple-50 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer col-span-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Convertir en facture
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDuplicateDocument(doc)}
                      className="py-2.5 px-3 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                      Dupliquer
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocumentToDelete(doc)}
                      className="py-2.5 px-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
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
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                              isDevis ? 'bg-brand-mist text-brand-ink' : 'bg-brand-mist text-brand-ink'
                            }`}
                          >
                            {isDevis ? 'DEVIS' : 'FAC'}
                          </span>
                          <span className="font-mono font-bold text-slate-900 text-xs">{doc.number}</span>
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
                                className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-brand-ink bg-brand-mist hover:bg-brand-mist px-2 py-0.5 rounded-md border border-brand-mid/25/80 w-fit transition-all cursor-pointer group shadow-2xs"
                                title="Cliquer pour voir la facture rattachée"
                              >
                                <span className="text-[9px] text-brand-mid font-bold uppercase tracking-wider flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-brand-mid" />
                                  Facture :
                                </span>
                                <span className="font-mono font-bold text-blue-950 group-hover:underline">{attachedFactureNum}</span>
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
                                className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200/80 w-fit transition-all cursor-pointer group shadow-2xs"
                                title="Cliquer pour voir le devis d'origine"
                              >
                                <span className="text-[9px] text-purple-600 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <FileText className="w-2.5 h-2.5 text-purple-600" />
                                  Devis d'origine :
                                </span>
                                <span className="font-mono font-bold text-purple-950 group-hover:underline">{refDevis}</span>
                              </button>
                            );
                          })()
                        )}
                      </td>

                      {/* Client Name */}
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        <div className="font-semibold text-slate-900">{doc.clientInfo.companyName || doc.clientInfo.name}</div>
                        {doc.clientInfo.companyName && (
                          <div className="text-[11px] text-slate-600">{doc.clientInfo.name}</div>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <div>{formatDateFR(doc.date)}</div>
                        <div className="text-[10px] text-slate-600">Éch : {formatDateFR(doc.dueDate)}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusSelector docId={doc.id} currentStatus={doc.status} onUpdateStatus={onUpdateStatus} />
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-sm">
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
                              className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-900 border border-purple-200/80 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
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
