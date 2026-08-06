import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { DocumentList } from './components/Documents/DocumentList';
import { DocumentEditor } from './components/Documents/DocumentEditor';
import { DocumentPDFPreview } from './components/Documents/DocumentPDFPreview';
import { ClientManager } from './components/Clients/ClientManager';
import { AnalyticsDashboard } from './components/Analytics/AnalyticsDashboard';
import { ClientFormModal } from './components/Clients/ClientFormModal';
import { CompanySettings } from './components/Settings/CompanySettings';
import { TrashManager } from './components/Trash/TrashManager';
import { AuthModal } from './components/Auth/AuthModal';
import { SavePopup } from './components/Common/SavePopup';
import {
  BusinessProfile,
  Client,
  InvoiceDocument,
  DocumentStatus,
  DocumentType,
  TrashItem,
  User,
} from './types';
import { EMPTY_BUSINESS_PROFILE } from './utils/defaults';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import {
  deleteClientFromDb,
  deleteDocumentFromDb,
  deleteTrashItemFromDb,
  emptyTrashInDb,
  fetchAllUserData,
  generateUniqueDocumentNumber,
  insertTrashItem,
  newClientId,
  newDocumentId,
  newItemId,
  newTrashId,
  saveBusinessProfile,
  signOut,
  upsertClient,
  upsertDocument,
  upsertDocuments,
} from './services/database';
import { ArrowLeft, Loader2, Shield } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [documents, setDocuments] = useState<InvoiceDocument[]>([]);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>({ ...EMPTY_BUSINESS_PROFILE });

  const [activeTab, setActiveTab] = useState<'documents' | 'clients' | 'analytics' | 'settings' | 'trash'>('documents');
  const [editorMode, setEditorMode] = useState(false);
  const [editingDocument, setEditingDocument] = useState<InvoiceDocument | null>(null);
  const [previewDocument, setPreviewDocument] = useState<InvoiceDocument | null>(null);
  const [isQuickClientModalOpen, setIsQuickClientModalOpen] = useState(false);
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFlash = useCallback((type: 'success' | 'error', message: string) => {
    setFlash({ type, message });
  }, []);

  const closeFlash = useCallback(() => setFlash(null), []);

  const loadUserData = useCallback(async (userId: string, options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    // Ne jamais afficher le spinner plein écran si on a déjà une session :
    // sinon l'éditeur de devis/facture est démonté et le brouillon est perdu.
    if (!silent) setDataLoading(true);
    setDataError(null);
    try {
      const data = await fetchAllUserData(userId);
      if (!data) {
        setDataError('Impossible de charger votre profil.');
        return;
      }
      setCurrentUser(data.user);
      setClients(data.clients);
      setDocuments(data.documents);
      setTrashItems(data.trashItems);
      setBusinessProfile(data.businessProfile);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Erreur de chargement des données.');
    } finally {
      if (!silent) setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthReady(true);
      return;
    }

    let mounted = true;
    let initialUserId: string | null = null;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const session = data.session;
      if (session?.user) {
        initialUserId = session.user.id;
        loadUserData(session.user.id).finally(() => {
          if (mounted) setAuthReady(true);
        });
      } else {
        setAuthReady(true);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setClients([]);
        setDocuments([]);
        setTrashItems([]);
        setBusinessProfile({ ...EMPTY_BUSINESS_PROFILE });
        setEditorMode(false);
        setEditingDocument(null);
        setPreviewDocument(null);
        return;
      }

      // TOKEN_REFRESHED se déclenche souvent en revenant sur l'onglet :
      // ne pas recharger les données (ça détruirait le formulaire en cours).
      if (event === 'TOKEN_REFRESHED') return;

      // SIGNED_IN : charger seulement si nouvel utilisateur / première connexion
      if (event === 'SIGNED_IN' && session?.user) {
        if (initialUserId && session.user.id === initialUserId) {
          // Déjà chargé via getSession — ignorer le doublon
          initialUserId = null;
          return;
        }
        void loadUserData(session.user.id, { silent: true });
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadUserData]);

  const generateDocumentNumber = useCallback(
    (type: DocumentType) => {
      if (!currentUser) return Promise.resolve(`DEV-${new Date().getFullYear()}-00001`);
      return generateUniqueDocumentNumber(currentUser.id, type, documents);
    },
    [currentUser, documents]
  );

  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    await loadUserData(user.id);
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentUser(null);
    setClients([]);
    setDocuments([]);
    setTrashItems([]);
    setBusinessProfile({ ...EMPTY_BUSINESS_PROFILE });
    setEditorMode(false);
    setPreviewDocument(null);
  };

  const handleSaveClient = async (clientData: Omit<Client, 'id' | 'createdAt'> & { id?: string }) => {
    if (!currentUser) throw new Error('Session expirée. Reconnectez-vous.');
    const existing = clientData.id ? clients.find((c) => c.id === clientData.id) : undefined;
    const client: Client = existing
      ? { ...existing, ...clientData, id: existing.id, createdAt: existing.createdAt }
      : {
          ...clientData,
          id: newClientId(),
          createdAt: new Date().toISOString().split('T')[0],
        };

    try {
      const saved = await upsertClient(currentUser.id, client);
      setClients((prev) => {
        const exists = prev.some((c) => c.id === saved.id);
        return exists ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...prev];
      });
      showFlash('success', 'Client enregistré');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Échec de l\'enregistrement du client.';
      showFlash('error', message);
      throw err;
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!currentUser) return;
    try {
      const clientToDelete = clients.find((c) => c.id === id);
      await deleteClientFromDb(currentUser.id, id);
      setClients((prev) => prev.filter((c) => c.id !== id));

      if (clientToDelete) {
        const trashItem = await insertTrashItem(currentUser.id, {
          id: newTrashId(),
          itemType: 'client',
          deletedAt: new Date().toISOString(),
          clientData: clientToDelete,
        });
        setTrashItems((prev) => [trashItem, ...prev]);
      }
      showFlash('success', 'Client déplacé dans la corbeille');
    } catch (err) {
      showFlash('error', err instanceof Error ? err.message : 'Suppression impossible.');
    }
  };

  const persistDocument = async (
    doc: InvoiceDocument,
    options: { closeEditor?: boolean; silent?: boolean } = {}
  ) => {
    if (!currentUser) throw new Error('Session expirée. Reconnectez-vous.');
    try {
      const saved = await upsertDocument(currentUser.id, {
        ...doc,
        updatedAt: new Date().toISOString(),
      });
      setDocuments((prev) => {
        const exists = prev.some((d) => d.id === saved.id);
        return exists ? prev.map((d) => (d.id === saved.id ? saved : d)) : [saved, ...prev];
      });
      if (previewDocument?.id === saved.id) {
        setPreviewDocument(saved);
      }
      if (options.closeEditor) {
        setEditorMode(false);
        setEditingDocument(null);
      }
      if (!options.silent) {
        showFlash('success', `${saved.type === 'devis' ? 'Devis' : 'Facture'} ${saved.number} enregistré`);
      }
      return saved;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Échec de l\'enregistrement du document.';
      showFlash('error', message);
      throw err;
    }
  };

  const handleSaveDocument = async (doc: InvoiceDocument) => {
    await persistDocument(doc, { closeEditor: true });
  };

  const handleDeleteDocument = async (id: string) => {
    if (!currentUser) return;
    try {
      const docToDelete = documents.find((d) => d.id === id);
      await deleteDocumentFromDb(currentUser.id, id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));

      if (docToDelete) {
        const trashItem = await insertTrashItem(currentUser.id, {
          id: newTrashId(),
          itemType: 'document',
          deletedAt: new Date().toISOString(),
          documentData: docToDelete,
        });
        setTrashItems((prev) => [trashItem, ...prev]);
      }
      showFlash('success', 'Document déplacé dans la corbeille');
    } catch (err) {
      showFlash('error', err instanceof Error ? err.message : 'Suppression impossible.');
    }
  };

  const handleRestoreTrashItem = async (trashItem: TrashItem) => {
    if (!currentUser) return;
    try {
      if (trashItem.itemType === 'document' && trashItem.documentData) {
        const doc = trashItem.documentData;
        if (!documents.some((d) => d.id === doc.id)) {
          const saved = await upsertDocument(currentUser.id, doc);
          setDocuments((prev) => [saved, ...prev]);
        }
      } else if (trashItem.itemType === 'client' && trashItem.clientData) {
        const client = trashItem.clientData;
        if (!clients.some((c) => c.id === client.id)) {
          const saved = await upsertClient(currentUser.id, client);
          setClients((prev) => [saved, ...prev]);
        }
      }

      await deleteTrashItemFromDb(currentUser.id, trashItem.id);
      setTrashItems((prev) => prev.filter((item) => item.id !== trashItem.id));
      showFlash('success', 'Élément restauré');
    } catch (err) {
      showFlash('error', err instanceof Error ? err.message : 'Restauration impossible.');
    }
  };

  const handlePermanentlyDeleteTrashItem = async (trashId: string) => {
    if (!currentUser) return;
    try {
      await deleteTrashItemFromDb(currentUser.id, trashId);
      setTrashItems((prev) => prev.filter((item) => item.id !== trashId));
    } catch (err) {
      showFlash('error', err instanceof Error ? err.message : 'Suppression définitive impossible.');
    }
  };

  const handleEmptyTrash = async () => {
    if (!currentUser) return;
    try {
      await emptyTrashInDb(currentUser.id);
      setTrashItems([]);
      showFlash('success', 'Corbeille vidée');
    } catch (err) {
      showFlash('error', err instanceof Error ? err.message : 'Impossible de vider la corbeille.');
    }
  };

  const handleUpdateDocumentStatus = async (id: string, status: DocumentStatus) => {
    if (!currentUser) return;
    const target = documents.find((d) => d.id === id);
    if (!target) return;
    try {
      await persistDocument({ ...target, status }, { silent: true });
      showFlash('success', 'Statut mis à jour');
    } catch {
      // flash déjà affiché par persistDocument
    }
  };

  const handleSaveBusinessProfile = async (profile: BusinessProfile) => {
    if (!currentUser) throw new Error('Session expirée. Reconnectez-vous.');
    try {
      const saved = await saveBusinessProfile(currentUser.id, profile);
      setBusinessProfile(saved);
      setCurrentUser((prev) => (prev ? { ...prev, businessProfile: saved } : prev));
      showFlash('success', 'Profil entreprise enregistré');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Échec de la sauvegarde du profil.';
      showFlash('error', message);
      throw err;
    }
  };

  const handleConvertDevisToFacture = async (devis: InvoiceDocument) => {
    if (!currentUser) return;
    const newFactureNumber = await generateUniqueDocumentNumber(
      currentUser.id,
      'facture',
      documents
    );
    const mentionDevis = `Facture issue du devis n° ${devis.number}`;
    const updatedNotes = devis.notes
      ? devis.notes.includes(mentionDevis)
        ? devis.notes
        : `${mentionDevis}\n${devis.notes}`
      : mentionDevis;

    const newFactureId = newDocumentId();
    const newFacture: InvoiceDocument = {
      ...devis,
      id: newFactureId,
      number: newFactureNumber,
      type: 'facture',
      status: 'en_attente',
      sourceDevisNumber: devis.number,
      sourceDevisId: devis.id,
      notes: updatedNotes,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedDevis: InvoiceDocument = {
      ...devis,
      status: 'converti',
      convertedFactureNumber: newFactureNumber,
      convertedFactureId: newFactureId,
      updatedAt: new Date().toISOString(),
    };

    const saved: InvoiceDocument[] = await upsertDocuments(currentUser.id, [newFacture, updatedDevis]);
    setDocuments((prev) => {
      const byId = new Map<string, InvoiceDocument>(prev.map((d) => [d.id, d]));
      saved.forEach((d) => byId.set(d.id, d));
      return Array.from(byId.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
    setEditingDocument(saved.find((d) => d.id === newFactureId) || newFacture);
    setEditorMode(true);
  };

  const handleDuplicateDocument = async (doc: InvoiceDocument) => {
    if (!currentUser) return;
    const number = await generateUniqueDocumentNumber(currentUser.id, doc.type, documents);
    const duplicated: InvoiceDocument = {
      ...doc,
      id: newDocumentId(),
      number,
      status: 'en_attente',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingDocument(duplicated);
    setEditorMode(true);
  };

  const handleCreateDocumentForClient = async (client: Client, type: DocumentType) => {
    if (!currentUser) return;
    const number = await generateUniqueDocumentNumber(currentUser.id, type, documents);
    const newDoc: InvoiceDocument = {
      id: newDocumentId(),
      number,
      type,
      status: 'en_attente',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      clientId: client.id,
      clientInfo: {
        name: client.name,
        companyName: client.companyName,
        email: client.email,
        phone: client.phone,
        address: client.address,
        nifRccm: client.nifRccm,
      },
      items: [
        {
          id: newItemId(),
          description: 'Prestation de service',
          quantity: 1,
          unitPrice: 0,
          taxRate: businessProfile.defaultTaxRate || 18,
          discount: 0,
        },
      ],
      currency: 'FCFA',
      taxRate: businessProfile.defaultTaxRate || 18,
      notes: 'Merci pour votre confiance.',
      termsAndConditions: `Paiement sous ${businessProfile.defaultPaymentTermsDays} jours.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingDocument(newDoc);
    setEditorMode(true);
    setActiveTab('documents');
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-rose-200 p-6 max-w-md text-center space-y-2">
          <Shield className="w-8 h-8 text-rose-500 mx-auto" />
          <h1 className="font-bold text-slate-900">Supabase non configuré</h1>
          <p className="text-sm text-slate-600">
            Ajoutez <code className="text-xs">VITE_SUPABASE_URL</code> et{' '}
            <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> dans <code className="text-xs">.env.local</code>.
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthModal currentUser={null} onLoginSuccess={handleLoginSuccess} isLockedMode={false} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setEditorMode(false);
          setPreviewDocument(null);
        }}
        businessProfile={businessProfile}
        trashCount={trashItems.length}
        onQuickNewDocument={() => {
          setEditingDocument(null);
          setEditorMode(true);
          setActiveTab('documents');
        }}
        onLogout={handleLogout}
        userName={currentUser.name}
      />

      {flash && (
        <SavePopup type={flash.type} message={flash.message} onClose={closeFlash} />
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-6">
        {dataLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : dataError ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm">
            {dataError}
          </div>
        ) : previewDocument ? (
          <div className="space-y-4">
            <button
              onClick={() => setPreviewDocument(null)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour à la liste des documents</span>
            </button>
            <DocumentPDFPreview
              document={previewDocument}
              businessProfile={businessProfile}
              onUpdatePreviewOptions={(opts) => {
                const updated = { ...previewDocument, previewOptions: opts };
                setPreviewDocument(updated);
                void persistDocument(updated, { silent: true });
              }}
              onEdit={() => {
                setEditingDocument(previewDocument);
                setEditorMode(true);
                setPreviewDocument(null);
              }}
              onDuplicate={() => handleDuplicateDocument(previewDocument)}
              onConvertDevisToFacture={
                previewDocument.type === 'devis'
                  ? () => handleConvertDevisToFacture(previewDocument)
                  : undefined
              }
            />
          </div>
        ) : editorMode ? (
          <DocumentEditor
            documentToEdit={editingDocument}
            clients={clients}
            businessProfile={businessProfile}
            existingDocuments={documents}
            generateDocumentNumber={generateDocumentNumber}
            onSave={handleSaveDocument}
            onCancel={() => {
              setEditorMode(false);
              setEditingDocument(null);
            }}
            onQuickAddClient={() => setIsQuickClientModalOpen(true)}
          />
        ) : (
          <>
            {activeTab === 'documents' && (
              <DocumentList
                documents={documents}
                onNewDocument={() => {
                  setEditingDocument(null);
                  setEditorMode(true);
                }}
                onEditDocument={(doc) => {
                  setEditingDocument(doc);
                  setEditorMode(true);
                }}
                onViewDocument={(doc) => setPreviewDocument(doc)}
                onDuplicateDocument={handleDuplicateDocument}
                onConvertDevisToFacture={handleConvertDevisToFacture}
                onUpdateStatus={handleUpdateDocumentStatus}
                onDeleteDocument={handleDeleteDocument}
              />
            )}

            {activeTab === 'clients' && (
              <ClientManager
                clients={clients}
                documents={documents}
                onSaveClient={handleSaveClient}
                onDeleteClient={handleDeleteClient}
                onCreateDocumentForClient={handleCreateDocumentForClient}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsDashboard
                documents={documents}
                clients={clients}
                onSelectDocument={(doc) => setPreviewDocument(doc)}
              />
            )}

            {activeTab === 'settings' && (
              <CompanySettings
                userId={currentUser.id}
                businessProfile={businessProfile}
                onSave={handleSaveBusinessProfile}
              />
            )}

            {activeTab === 'trash' && (
              <TrashManager
                trashItems={trashItems}
                onRestoreItem={handleRestoreTrashItem}
                onPermanentlyDeleteItem={handlePermanentlyDeleteTrashItem}
                onEmptyTrash={handleEmptyTrash}
              />
            )}
          </>
        )}
      </main>

      {isQuickClientModalOpen && (
        <ClientFormModal
          onSave={async (c) => {
            await handleSaveClient(c);
            setIsQuickClientModalOpen(false);
          }}
          onClose={() => setIsQuickClientModalOpen(false)}
        />
      )}

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© {new Date().getFullYear()} FacturaCFA - Application de Facturation en Francs CFA (XOF / XAF)</p>
          <div className="flex items-center gap-3 text-slate-400">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>Données & fichiers sécurisés sur Supabase</span>
            </span>
            <span>•</span>
            <span>Export PDF Haute Résolution</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
