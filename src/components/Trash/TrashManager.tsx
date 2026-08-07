import React, { useState } from 'react';
import { Trash2, RotateCcw, Search, FileText, Users, AlertTriangle, ShieldCheck, CheckCircle2, ArrowLeft } from 'lucide-react';
import { TrashItem } from '../../types';
import { formatFCFA, calculateDocumentTotals } from '../../utils/currency';
import { ConfirmDeleteModal } from '../Common/ConfirmDeleteModal';

interface TrashManagerProps {
  trashItems: TrashItem[];
  onRestoreItem: (item: TrashItem) => void;
  onPermanentlyDeleteItem: (id: string) => void;
  onEmptyTrash: () => void;
}

export const TrashManager: React.FC<TrashManagerProps> = ({
  trashItems,
  onRestoreItem,
  onPermanentlyDeleteItem,
  onEmptyTrash,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'document' | 'client'>('all');
  
  // Modals state
  const [deleteTarget, setDeleteTarget] = useState<TrashItem | null>(null);
  const [isEmptyTrashModalOpen, setIsEmptyTrashModalOpen] = useState(false);
  const [restoredToast, setRestoredToast] = useState<string | null>(null);

  const handleRestore = (item: TrashItem) => {
    onRestoreItem(item);
    const label = item.itemType === 'document' && item.documentData
      ? `Document ${item.documentData.number}`
      : item.clientData
      ? `Client ${item.clientData.name}`
      : 'Élément';
    setRestoredToast(`${label} restauré avec succès !`);
    setTimeout(() => setRestoredToast(null), 3000);
  };

  const filteredItems = trashItems.filter((trashItem) => {
    // Type filter
    if (filterType !== 'all' && trashItem.itemType !== filterType) {
      return false;
    }

    if (!searchTerm.trim()) return true;

    const query = searchTerm.toLowerCase();

    if (trashItem.itemType === 'document' && trashItem.documentData) {
      const doc = trashItem.documentData;
      return (
        doc.number.toLowerCase().includes(query) ||
        doc.clientInfo.name.toLowerCase().includes(query) ||
        (doc.clientInfo.companyName && doc.clientInfo.companyName.toLowerCase().includes(query))
      );
    }

    if (trashItem.itemType === 'client' && trashItem.clientData) {
      const client = trashItem.clientData;
      return (
        client.name.toLowerCase().includes(query) ||
        (client.companyName && client.companyName.toLowerCase().includes(query)) ||
        client.email.toLowerCase().includes(query) ||
        client.phone.includes(query)
      );
    }

    return false;
  });

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {restoredToast && (
        <div className="bg-brand-ink text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between text-xs font-bold animate-bounce">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-200" />
            <span>{restoredToast}</span>
          </div>
        </div>
      )}

      <div className="glass-nav text-white p-5 sm:p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-400/30 flex items-center justify-center">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-300/90 mb-1">Corbeille</p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-extrabold text-white tracking-tight">Éléments supprimés</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-200 text-xs font-bold">
                {trashItems.length}
              </span>
            </div>
            <p className="text-xs text-brand-sand/55 mt-1">
              Restaurez devis, factures et clients en un clic.
            </p>
          </div>
        </div>

        {trashItems.length > 0 && (
          <button
            type="button"
            onClick={() => setIsEmptyTrashModalOpen(true)}
            className="hover-press px-4 py-2.5 bg-rose-600/85 hover:bg-rose-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer border border-rose-400/40"
          >
            <Trash2 className="w-4 h-4" />
            <span>Vider la corbeille</span>
          </button>
        )}
      </div>

      <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
          <input
            type="text"
            placeholder="Rechercher dans la corbeille..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-input w-full pl-10 pr-4 py-2.5 text-xs font-medium"
          />
        </div>

        <div className="glass-segment w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`glass-segment-btn ${filterType === 'all' ? 'is-active' : ''}`}
          >
            Tous ({trashItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('document')}
            className={`glass-segment-btn inline-flex items-center gap-1.5 ${filterType === 'document' ? 'is-active' : ''}`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Documents ({trashItems.filter((i) => i.itemType === 'document').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('client')}
            className={`glass-segment-btn inline-flex items-center gap-1.5 ${filterType === 'client' ? 'is-active' : ''}`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Clients ({trashItems.filter((i) => i.itemType === 'client').length})</span>
          </button>
        </div>
      </div>

      {/* Trash Content List */}
      {filteredItems.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Trash2 className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">La corbeille est vide</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchTerm
              ? 'Aucun élément supprimé ne correspond à votre recherche.'
              : 'Les devis, factures ou clients que vous supprimerez apparaîtront ici et pourront être restaurés à tout moment.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((trashItem) => {
            const isDoc = trashItem.itemType === 'document' && trashItem.documentData;
            const doc = trashItem.documentData;
            const client = trashItem.clientData;

            const docTotals = doc ? calculateDocumentTotals(doc.items, doc.taxRate) : null;

            return (
              <div
                key={trashItem.id}
                className="glass-card p-4 hover:border-slate-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Info Block */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                      isDoc
                        ? doc?.type === 'devis'
                          ? 'bg-amber-50 text-amber-600 border border-amber-200'
                          : 'bg-brand-mist text-brand-mid border border-brand-mid/25'
                        : 'bg-brand-mist text-indigo-600 border border-brand-mid/25'
                    }`}
                  >
                    {isDoc ? <FileText className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-slate-900">
                        {isDoc ? doc?.number : client?.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          isDoc
                            ? doc?.type === 'devis'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-brand-mist text-brand-ink'
                            : 'bg-brand-mist text-indigo-800'
                        }`}
                      >
                        {isDoc ? (doc?.type === 'devis' ? 'Devis' : 'Facture') : 'Client'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Supprimé le {formatDate(trashItem.deletedAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
                      {isDoc
                        ? `Client : ${doc?.clientInfo.companyName || doc?.clientInfo.name}`
                        : client?.companyName
                        ? `${client.companyName} (${client.email || client.phone})`
                        : `${client?.email || client?.phone || 'Pas de coordonnées'}`}
                    </p>

                    {isDoc && docTotals && (
                      <div className="text-xs font-mono font-bold text-slate-800 mt-1">
                        Montant : {formatFCFA(docTotals.totalTTC, doc?.currency)} TTC
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Block */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    onClick={() => handleRestore(trashItem)}
                    className="px-3.5 py-2 bg-brand-mist hover:bg-brand-mist text-brand-ink font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-brand-mid/25"
                    title="Restauration immédiate"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurer</span>
                  </button>

                  <button
                    onClick={() => setDeleteTarget(trashItem)}
                    className="px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200 hover:border-rose-200"
                    title="Supprimer définitivement"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Supprimer définitivement</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Permanent Item Delete */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Supprimer définitivement ?"
        itemTitle={
          deleteTarget?.itemType === 'document'
            ? `Document N° ${deleteTarget.documentData?.number}`
            : `Client : ${deleteTarget?.clientData?.name}`
        }
        itemSubtitle={
          deleteTarget?.itemType === 'document'
            ? `Client : ${deleteTarget.documentData?.clientInfo.companyName || deleteTarget.documentData?.clientInfo.name}`
            : deleteTarget?.clientData?.email
        }
        message="Êtes-vous sûr de vouloir supprimer définitivement cet élément ? Il sera retiré de la mémoire du logiciel et ne pourra plus être récupéré."
        confirmText="Supprimer définitivement"
        isPermanent={true}
        onConfirm={() => {
          if (deleteTarget) {
            onPermanentlyDeleteItem(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Confirmation Modal for Empty Trash */}
      <ConfirmDeleteModal
        isOpen={isEmptyTrashModalOpen}
        title="Vider la corbeille ?"
        message={`Êtes-vous sûr de vouloir supprimer définitivement les ${trashItems.length} élément(s) présent(s) dans la corbeille ? Cette action est irréversible.`}
        confirmText="Oui, Tout supprimer"
        isPermanent={true}
        onConfirm={() => {
          onEmptyTrash();
          setIsEmptyTrashModalOpen(false);
        }}
        onClose={() => setIsEmptyTrashModalOpen(false)}
      />
    </div>
  );
};
