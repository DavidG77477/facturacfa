import React, { useState } from 'react';
import { Plus, Search, User, Building, Mail, Phone, MapPin, Edit3, Trash2, FileText, ArrowUpRight, DollarSign } from 'lucide-react';
import { Client, InvoiceDocument } from '../../types';
import { ClientFormModal } from './ClientFormModal';
import { formatFCFA, calculateDocumentTotals } from '../../utils/currency';

interface ClientManagerProps {
  clients: Client[];
  documents: InvoiceDocument[];
  onSaveClient: (clientData: Omit<Client, 'id' | 'createdAt'> & { id?: string }) => Promise<void> | void;
  onDeleteClient: (id: string) => void;
  onCreateDocumentForClient: (client: Client, type: 'devis' | 'facture') => void;
}

export const ClientManager: React.FC<ClientManagerProps> = ({
  clients,
  documents,
  onSaveClient,
  onDeleteClient,
  onCreateDocumentForClient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'entreprise' | 'personne_physique'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const filteredClients = clients.filter((c) => {
    const isEntreprise = c.clientType === 'entreprise' || (!c.clientType && !!c.companyName);
    const isPersonnePhysique = c.clientType === 'personne_physique' || (!c.clientType && !c.companyName);

    if (categoryFilter === 'entreprise' && !isEntreprise) return false;
    if (categoryFilter === 'personne_physique' && !isPersonnePhysique) return false;

    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.companyName && c.companyName.toLowerCase().includes(term)) ||
      c.email.toLowerCase().includes(term) ||
      c.phone.includes(term)
    );
  });

  const getClientStats = (clientId: string) => {
    const clientDocs = documents.filter((d) => d.clientId === clientId);
    const invoices = clientDocs.filter((d) => d.type === 'facture');
    const devis = clientDocs.filter((d) => d.type === 'devis');

    let totalBilled = 0;
    invoices.forEach((inv) => {
      if (inv.status === 'payee') {
        const totals = calculateDocumentTotals(inv.items, inv.taxRate);
        totalBilled += totals.totalTTC;
      }
    });

    return {
      totalDocs: clientDocs.length,
      invoicesCount: invoices.length,
      devisCount: devis.length,
      totalBilled,
    };
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedClient(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <User className="w-6 h-6 text-brand-mid" />
            <span className="font-display">Gestion des Clients ({clients.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Répertoire centralisé de vos clients et historique de facturation
          </p>
        </div>

        <button
          onClick={handleAddNew}
          className="hover-press w-full sm:w-auto px-4 py-3 sm:py-2.5 bg-brand-ink hover:bg-brand-deep text-white font-semibold rounded-xl shadow-sm flex items-center justify-center gap-2 text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Client</span>
        </button>
      </div>

      {/* Search Bar & Category Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher nom, société, email…"
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid shadow-xs"
          />
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 overflow-x-auto">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-2.5 sm:py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              categoryFilter === 'all'
                ? 'bg-brand-ink text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tous ({clients.length})
          </button>
          <button
            onClick={() => setCategoryFilter('entreprise')}
            className={`px-3 py-2.5 sm:py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              categoryFilter === 'entreprise'
                ? 'bg-brand-ink text-white shadow-xs'
                : 'text-slate-600 hover:bg-brand-mist hover:text-brand-ink'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Entreprises</span>
          </button>
          <button
            onClick={() => setCategoryFilter('personne_physique')}
            className={`px-3 py-2.5 sm:py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              categoryFilter === 'personne_physique'
                ? 'bg-brand-ink text-white shadow-xs'
                : 'text-slate-600 hover:bg-brand-mist hover:text-brand-ink'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span className="sm:hidden">Particuliers</span>
            <span className="hidden sm:inline">Personnes physiques</span>
          </button>
        </div>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80 p-6">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">Aucun client trouvé</h3>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm || categoryFilter !== 'all' ? 'Essayez de modifier votre recherche ou filtre.' : 'Commencez par ajouter votre premier client.'}
          </p>
          {!searchTerm && categoryFilter === 'all' && (
            <button
              onClick={handleAddNew}
              className="mt-4 px-4 py-2 bg-brand-ink text-white rounded-xl font-medium text-xs cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Créer un client</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map((client) => {
            const stats = getClientStats(client.id);
            const isEntreprise = client.clientType === 'entreprise' || (!client.clientType && !!client.companyName);

            return (
              <div
                key={client.id}
                className="hover-lift bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Category Badge & Actions Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                        isEntreprise
                          ? 'bg-brand-mist text-brand-ink border-brand-mid/25/80'
                          : 'bg-brand-mist text-brand-ink border-brand-mid/25/80'
                      }`}
                    >
                      {isEntreprise ? <Building className="w-3 h-3 text-brand-mid" /> : <User className="w-3 h-3 text-brand-mid" />}
                      <span>{isEntreprise ? 'Entreprise' : 'Personne Physique'}</span>
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(client)}
                        title="Modifier"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setClientToDelete(client)}
                        title="Supprimer ce client"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        isEntreprise ? 'bg-brand-mist/70 text-brand-ink' : 'bg-brand-mist/70 text-brand-ink'
                      }`}
                    >
                      {isEntreprise && client.companyName
                        ? client.companyName.charAt(0)
                        : client.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug">
                        {isEntreprise && client.companyName ? client.companyName : client.name}
                      </h3>
                      {isEntreprise && client.companyName && (
                        <p className="text-xs text-slate-500 font-medium">Contact: {client.name}</p>
                      )}
                    </div>
                  </div>

                  {/* Contact Info List */}
                  <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {client.address}
                          {client.city ? `, ${client.city}` : ''}
                        </span>
                      </div>
                    )}
                    {client.nifRccm && (
                      <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 mt-1">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{client.nifRccm}</span>
                      </div>
                    )}
                  </div>

                  {/* Client Stats Badge */}
                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                    <div className="bg-brand-mist/60 border border-blue-100 p-2.5 rounded-xl">
                      <div className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                        Total Réglé
                      </div>
                      <div className="font-bold text-brand-ink text-sm mt-0.5">
                        {formatFCFA(stats.totalBilled)}
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                      <div className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                        Documents
                      </div>
                      <div className="font-bold text-slate-800 text-sm mt-0.5">
                        {stats.invoicesCount} fact. / {stats.devisCount} devis
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => onCreateDocumentForClient(client, 'facture')}
                    className="flex-1 py-1.5 px-2 bg-brand-mist hover:bg-brand-mist text-brand-ink font-semibold rounded-lg text-xs transition-colors text-center cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>+ Facture</span>
                  </button>
                  <button
                    onClick={() => onCreateDocumentForClient(client, 'devis')}
                    className="flex-1 py-1.5 px-2 bg-brand-mist hover:bg-brand-mist text-brand-ink font-semibold rounded-lg text-xs transition-colors text-center cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>+ Devis</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {isModalOpen && (
        <ClientFormModal
          client={selectedClient}
          onSave={onSaveClient}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-brand-ink/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Supprimer le client</h3>
                <p className="text-xs text-slate-500 font-medium">Confirmation requise</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed mb-6">
              Êtes-vous sûr de vouloir supprimer le client{' '}
              <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {clientToDelete.companyName || clientToDelete.name}
              </span>{' '}
              ? Le client sera placé dans la Corbeille où vous pourrez le restaurer à tout moment.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteClient(clientToDelete.id);
                  setClientToDelete(null);
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
