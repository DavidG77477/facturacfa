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

      {/* Header Banner */}
      <div className="bg-brand-ink text-white p-6 rounded-3xl border border-brand-deep shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-black">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white">Corbeille & Éléments Supprimés</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-extrabold">
                {trashItems.length} élément{trashItems.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Retrouvez et restaurez vos devis, factures et clients récemment supprimés en un clic.
            </p>
          </div>
        </div>

        {trashItems.length > 0 && (
          <button
            onClick={() => setIsEmptyTrashModalOpen(true)}
            className="px-4 py-2.5 bg-rose-600/80 hover:bg-rose-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm border border-rose-500/50"
          >
            <Trash2 className="w-4 h-4" />
            <span>Vider la corbeille</span>
          </button>
        )}
      </div>

      {/* Search and Filter Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher dans la corbeille..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-mid focus:bg-white transition-all"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tous ({trashItems.length})
          </button>
          <button
            onClick={() => setFilterType('document')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'document'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Documents ({trashItems.filter((i) => i.itemType === 'document').length})</span>
          </button>
          <button
            onClick={() => setFilterType('client')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'client'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Clients ({trashItems.filter((i) => i.itemType === 'client').length})</span>
          </button>
        </div>
      </div>

      {/* Trash Content List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3">
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
                className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
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
