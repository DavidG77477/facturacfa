import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Eye, FileText, User, Calendar, Percent, Check, RefreshCw, AlertTriangle, ShieldCheck, Sparkles, CheckCircle2, Ruler, Loader2, Heading2 } from 'lucide-react';
import { BusinessProfile, Client, DocumentItem, DocumentType, InvoiceDocument, DocumentStatus, DocumentPreviewOptions, isSectionItem } from '../../types';
import { formatFCFA, calculateDocumentTotals, numberToWordsFR } from '../../utils/currency';
import { isDocumentNumberUnique } from '../../utils/documentNumber';
import { DocumentPDFPreview } from './DocumentPDFPreview';
import { FrenchDateInput } from '../ui/FrenchDateInput';

const DRAFT_STORAGE_KEY = 'facturacfa_document_draft';

interface DocumentDraft {
  draftKey: string;
  type: DocumentType;
  number: string;
  status: DocumentStatus;
  date: string;
  dueDate: string;
  selectedClientId: string;
  sourceDevisNumber?: string;
  sourceDevisId?: string;
  items: DocumentItem[];
  taxRate: number;
  currency: 'FCFA' | 'XOF' | 'XAF';
  notes: string;
  terms: string;
  showDimensions: boolean;
  showDiscount: boolean;
  previewOptions: DocumentPreviewOptions;
  docId?: string;
  createdAt?: string;
}

function readDraft(draftKey: string): DocumentDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as DocumentDraft;
    return draft.draftKey === draftKey ? draft : null;
  } catch {
    return null;
  }
}

function clearDraft(): void {
  sessionStorage.removeItem(DRAFT_STORAGE_KEY);
}

/** Champs pouvant être recopiés en tirant la poignée (comme Excel). */
type FillableField = 'description' | 'length' | 'width' | 'clientPrice' | 'quantity' | 'unitPrice' | 'discount';

interface FillDragState {
  field: FillableField;
  startIndex: number;
  endIndex: number;
  value: DocumentItem[FillableField];
}

interface FillableCellProps {
  field: FillableField;
  rowIndex: number;
  value: DocumentItem[FillableField];
  fillDrag: FillDragState | null;
  onFillStart: (
    field: FillableField,
    rowIndex: number,
    value: DocumentItem[FillableField],
    e: React.PointerEvent
  ) => void;
  className?: string;
  children: React.ReactNode;
}

const FillableCell: React.FC<FillableCellProps> = ({
  field,
  rowIndex,
  value,
  fillDrag,
  onFillStart,
  className = '',
  children,
}) => {
  const inRange =
    !!fillDrag &&
    fillDrag.field === field &&
    rowIndex >= Math.min(fillDrag.startIndex, fillDrag.endIndex) &&
    rowIndex <= Math.max(fillDrag.startIndex, fillDrag.endIndex);
  const isOrigin = fillDrag?.field === field && fillDrag.startIndex === rowIndex;

  return (
    <td
      className={`${inRange ? 'bg-brand-mist/80 ring-1 ring-inset ring-brand-mid/60' : ''} ${className}`}
      data-fill-field={field}
      data-fill-row={rowIndex}
    >
      {/* Input + poignée Excel collée à droite (toujours visible) */}
      <div className="flex items-end gap-0.5">
        <div className="min-w-0 flex-1">{children}</div>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Maintenir et tirer pour recopier"
          title="Maintenir et tirer vers le bas pour recopier"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFillStart(field, rowIndex, value, e);
          }}
          className={`shrink-0 w-4 h-4 mb-0.5 rounded-[2px] border-2 border-slate-900 bg-brand-glow shadow cursor-crosshair touch-none hover:bg-brand-ink active:bg-brand-deep ${
            isOrigin ? 'ring-2 ring-brand-glow scale-110 bg-brand-ink' : ''
          }`}
        />
      </div>
    </td>
  );
};

interface DocumentEditorProps {
  documentToEdit?: InvoiceDocument | null;
  /** Type demandé pour une création (ignoré en édition) */
  initialType?: DocumentType;
  clients: Client[];
  businessProfile: BusinessProfile;
  existingDocuments?: InvoiceDocument[];
  generateDocumentNumber: (type: DocumentType) => Promise<string>;
  onSave: (doc: InvoiceDocument) => Promise<void> | void;
  onCancel: () => void;
  onQuickAddClient: () => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  documentToEdit,
  initialType = 'facture',
  clients,
  businessProfile,
  existingDocuments = [],
  generateDocumentNumber,
  onSave,
  onCancel,
  onQuickAddClient,
}) => {
  const isEditing = !!documentToEdit;
  const draftKey = documentToEdit?.id || 'new-document';
  const restoredDraft = useMemo(() => {
    const draft = readDraft(draftKey);
    // Ne pas restaurer un brouillon d'un autre type (ex. facture quand on crée un devis)
    if (!documentToEdit && draft && draft.type !== initialType) return null;
    return draft;
  }, [draftKey, documentToEdit, initialType]);
  const draftSeed = restoredDraft;

  const [type, setType] = useState<DocumentType>(
    draftSeed?.type || documentToEdit?.type || initialType
  );
  const [number, setNumber] = useState(draftSeed?.number || documentToEdit?.number || '');
  const [status, setStatus] = useState<DocumentStatus>(draftSeed?.status || documentToEdit?.status || 'en_attente');
  const [date, setDate] = useState(
    draftSeed?.date || documentToEdit?.date || new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState(
    draftSeed?.dueDate ||
      documentToEdit?.dueDate ||
      new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [selectedClientId, setSelectedClientId] = useState<string>(
    draftSeed?.selectedClientId || documentToEdit?.clientId || clients[0]?.id || ''
  );

  const [sourceDevisNumber, setSourceDevisNumber] = useState<string | undefined>(
    draftSeed?.sourceDevisNumber || documentToEdit?.sourceDevisNumber
  );
  const [sourceDevisId, setSourceDevisId] = useState<string | undefined>(
    draftSeed?.sourceDevisId || documentToEdit?.sourceDevisId
  );
  const [convertedFactureNumber] = useState<string | undefined>(documentToEdit?.convertedFactureNumber);
  const [convertedFactureId] = useState<string | undefined>(documentToEdit?.convertedFactureId);
  const [docId] = useState<string>(draftSeed?.docId || documentToEdit?.id || crypto.randomUUID());
  const [createdAt] = useState<string>(
    draftSeed?.createdAt || documentToEdit?.createdAt || new Date().toISOString()
  );

  const [items, setItems] = useState<DocumentItem[]>(
    draftSeed?.items ||
      documentToEdit?.items || [
        {
          id: crypto.randomUUID(),
          description: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: businessProfile.defaultTaxRate || 18,
          discount: 0,
        },
      ]
  );

  const [taxRate, setTaxRate] = useState<number>(
    draftSeed?.taxRate ?? documentToEdit?.taxRate ?? businessProfile.defaultTaxRate ?? 18
  );
  const [currency, setCurrency] = useState<'FCFA' | 'XOF' | 'XAF'>(
    draftSeed?.currency || documentToEdit?.currency || 'FCFA'
  );
  const [notes, setNotes] = useState(
    draftSeed?.notes || documentToEdit?.notes || 'Merci pour votre confiance.'
  );
  const [terms, setTerms] = useState(
    draftSeed?.terms ||
      documentToEdit?.termsAndConditions ||
      `Paiement à ${businessProfile.defaultPaymentTermsDays} jours par virement ou Mobile Money.`
  );

  const [showDimensions, setShowDimensions] = useState<boolean>(() => {
    if (draftSeed?.showDimensions !== undefined) return draftSeed.showDimensions;
    if (documentToEdit?.previewOptions?.showDimensions !== undefined) {
      return documentToEdit.previewOptions.showDimensions;
    }
    return documentToEdit?.items
      ? documentToEdit.items.some((it) => !isSectionItem(it) && Boolean(it.length || it.width))
      : true;
  });

  const [showDiscount, setShowDiscount] = useState<boolean>(() => {
    if (draftSeed?.showDiscount !== undefined) return draftSeed.showDiscount;
    if (documentToEdit?.previewOptions?.showDiscount !== undefined) {
      return documentToEdit.previewOptions.showDiscount;
    }
    return true;
  });

  const [previewOptions, setPreviewOptions] = useState<DocumentPreviewOptions>(
    draftSeed?.previewOptions ||
      documentToEdit?.previewOptions || {
        showContactName: true,
        showClientNif: true,
        showClientPhoneEmail: true,
        showClientAddress: true,
        showPaymentDetails: false,
        showAmountInWords: true,
        showSignatures: true,
        showDimensions: showDimensions,
        showDiscount: showDiscount,
      }
  );

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const hasUserEditedRef = useRef(Boolean(restoredDraft));
  const skipNextTypeNumberGen = useRef(Boolean(restoredDraft?.number));

  // Uniqueness check for document number
  const isNumberUnique = isDocumentNumberUnique(number, documentToEdit?.id || docId, existingDocuments);

  // Ne régénérer le numéro que quand le TYPE change — pas quand la liste documents se recharge
  useEffect(() => {
    if (isEditing) return;
    if (skipNextTypeNumberGen.current) {
      skipNextTypeNumberGen.current = false;
      return;
    }
    let cancelled = false;
    generateDocumentNumber(type).then((n) => {
      if (!cancelled) {
        setNumber(n);
        setStatus('en_attente');
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- volontairement hors generateDocumentNumber
  }, [type, isEditing]);

  // Autosave brouillon (session) pour survivre à un remount / changement d'onglet
  useEffect(() => {
    const draft: DocumentDraft = {
      draftKey,
      type,
      number,
      status,
      date,
      dueDate,
      selectedClientId,
      sourceDevisNumber,
      sourceDevisId,
      items,
      taxRate,
      currency,
      notes,
      terms,
      showDimensions,
      showDiscount,
      previewOptions,
      docId,
      createdAt,
    };
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        hasUserEditedRef.current = true;
      } catch {
        // quota / mode privé
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [
    draftKey,
    type,
    number,
    status,
    date,
    dueDate,
    selectedClientId,
    sourceDevisNumber,
    sourceDevisId,
    items,
    taxRate,
    currency,
    notes,
    terms,
    showDimensions,
    showDiscount,
    previewOptions,
    docId,
    createdAt,
  ]);

  // Avertir si fermeture d'onglet / refresh avec brouillon
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUserEditedRef.current || isSaving) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isSaving]);

  const selectedClient = clients.find((c) => c.id === selectedClientId) || clients[0];

  const totals = calculateDocumentTotals(items, taxRate);
  const amountInWords = numberToWordsFR(totals.totalTTC, `Francs ${currency}`);

  // Formule P.U. : ((Largeur × Hauteur) / 1 000 000) × Prix client
  // length = Hauteur (mm), width = Largeur (mm)
  const computeCalculatedPrice = (lengthVal: any, widthVal: any, clientPriceVal: any): number | null => {
    if (clientPriceVal === undefined || clientPriceVal === null || clientPriceVal === '') return null;

    const prixClient =
      typeof clientPriceVal === 'number'
        ? clientPriceVal
        : parseFloat(String(clientPriceVal).replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (isNaN(prixClient) || prixClient < 0) return null;

    const hauteur = parseFloat(String(lengthVal || '').replace(/[^0-9.,]/g, '').replace(',', '.'));
    const largeur = parseFloat(String(widthVal || '').replace(/[^0-9.,]/g, '').replace(',', '.'));

    if (isNaN(hauteur) || hauteur <= 0 || isNaN(largeur) || largeur <= 0) return null;

    return Math.round(((largeur * hauteur) / 1000000) * prixClient);
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}_${prev.length + 1}`,
        kind: 'line',
        description: '',
        length: '',
        width: '',
        clientPrice: undefined,
        quantity: 1,
        unitPrice: 0,
        taxRate: taxRate,
        discount: 0,
      },
    ]);
  };

  const handleAddSection = (insertAtIndex?: number) => {
    const section: DocumentItem = {
      id: `section_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      kind: 'section',
      description: '',
      quantity: 0,
      unitPrice: 0,
      taxRate: 0,
      discount: 0,
    };
    setItems((prev) => {
      if (insertAtIndex === undefined || insertAtIndex < 0 || insertAtIndex > prev.length) {
        return [...prev, section];
      }
      const next = [...prev];
      next.splice(insertAtIndex, 0, section);
      return next;
    });
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) return;
    const target = items.find((it) => it.id === id);
    if (!target) return;
    // Garder au moins une ligne facturable
    if (!isSectionItem(target) && items.filter((it) => !isSectionItem(it)).length <= 1) {
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof DocumentItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };

          // Automatically recalculate unitPrice if length, width, or clientPrice is edited
          if (field === 'length' || field === 'width' || field === 'clientPrice') {
            const calculatedPrice = computeCalculatedPrice(updated.length, updated.width, updated.clientPrice);
            if (calculatedPrice !== null) {
              updated.unitPrice = calculatedPrice;
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  const [fillDrag, setFillDrag] = useState<FillDragState | null>(null);
  const fillDragRef = useRef<FillDragState | null>(null);
  const fillListenersRef = useRef<{
    move: (e: PointerEvent) => void;
    up: (e: PointerEvent) => void;
  } | null>(null);

  const applyColumnFill = (drag: FillDragState) => {
    const from = Math.min(drag.startIndex, drag.endIndex);
    const to = Math.max(drag.startIndex, drag.endIndex);
    if (from === to) return;

    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx < from || idx > to) return item;
        if (isSectionItem(item)) return item;
        let nextValue: DocumentItem[FillableField] = drag.value;
        if (drag.field === 'quantity') {
          nextValue = Math.max(1, Number(drag.value) || 1);
        }
        const updated: DocumentItem = { ...item, [drag.field]: nextValue };
        if (drag.field === 'length' || drag.field === 'width' || drag.field === 'clientPrice') {
          const calculatedPrice = computeCalculatedPrice(
            updated.length,
            updated.width,
            updated.clientPrice
          );
          if (calculatedPrice !== null) {
            updated.unitPrice = calculatedPrice;
          }
        }
        return updated;
      })
    );
  };

  const stopFillListeners = () => {
    if (!fillListenersRef.current) return;
    window.removeEventListener('pointermove', fillListenersRef.current.move);
    window.removeEventListener('pointerup', fillListenersRef.current.up);
    window.removeEventListener('pointercancel', fillListenersRef.current.up);
    fillListenersRef.current = null;
  };

  const resolveFillRowIndex = (clientX: number, clientY: number, field: FillableField): number | null => {
    const el = document.elementFromPoint(clientX, clientY);
    const cell = el?.closest?.(`[data-fill-field="${field}"]`) as HTMLElement | null;
    if (cell) {
      const idx = Number(cell.getAttribute('data-fill-row'));
      if (!Number.isNaN(idx)) return idx;
    }
    // Fallback : trouver la ligne par sa position verticale
    const rows = Array.from(document.querySelectorAll<HTMLElement>(`[data-fill-field="${field}"]`));
    for (const rowCell of rows) {
      const rect = rowCell.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        const idx = Number(rowCell.getAttribute('data-fill-row'));
        if (!Number.isNaN(idx)) return idx;
      }
    }
    return null;
  };

  const handleFillStart = (
    field: FillableField,
    rowIndex: number,
    value: DocumentItem[FillableField],
    e: React.PointerEvent
  ) => {
    stopFillListeners();
    const drag: FillDragState = { field, startIndex: rowIndex, endIndex: rowIndex, value };
    fillDragRef.current = drag;
    setFillDrag(drag);

    const onMove = (ev: PointerEvent) => {
      const current = fillDragRef.current;
      if (!current) return;
      const idx = resolveFillRowIndex(ev.clientX, ev.clientY, current.field);
      if (idx === null || current.endIndex === idx) return;
      const next = { ...current, endIndex: idx };
      fillDragRef.current = next;
      setFillDrag(next);
    };

    const onUp = () => {
      const current = fillDragRef.current;
      stopFillListeners();
      fillDragRef.current = null;
      setFillDrag(null);
      if (current) applyColumnFill(current);
    };

    fillListenersRef.current = { move: onMove, up: onUp };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    // Capture sur window via le target pour ne pas perdre le drag
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    return () => stopFillListeners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (isSaving) return;
    if (!selectedClient) {
      setSaveError('Veuillez sélectionner ou ajouter un client.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      let finalNumber = number.trim();
      if (!finalNumber || !isNumberUnique) {
        finalNumber = await generateDocumentNumber(type);
        setNumber(finalNumber);
      }

      const doc: InvoiceDocument = {
        id: docId,
        number: finalNumber,
        type,
        status,
        date,
        dueDate,
        clientId: selectedClient.id,
        clientInfo: {
          name: selectedClient.name,
          companyName: selectedClient.companyName,
          email: selectedClient.email,
          phone: selectedClient.phone,
          address: selectedClient.address,
          nifRccm: selectedClient.nifRccm,
        },
        items,
        currency,
        taxRate,
        notes,
        termsAndConditions: terms,
        sourceDevisNumber,
        sourceDevisId,
        convertedFactureNumber,
        convertedFactureId,
        amountInWords,
        previewOptions: { ...previewOptions, showDimensions, showDiscount },
        createdAt,
        updatedAt: new Date().toISOString(),
      };

      await onSave(doc);
      clearDraft();
      hasUserEditedRef.current = false;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Échec de l\'enregistrement.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    clearDraft();
    hasUserEditedRef.current = false;
    onCancel();
  };

  const constructPreviewDocument = (): InvoiceDocument => {
    return {
      id: docId,
      number,
      type,
      status,
      date,
      dueDate,
      clientId: selectedClient?.id || '',
      clientInfo: selectedClient
        ? {
            name: selectedClient.name,
            companyName: selectedClient.companyName,
            email: selectedClient.email,
            phone: selectedClient.phone,
            address: selectedClient.address,
            nifRccm: selectedClient.nifRccm,
          }
        : {
            name: 'Client non renseigné',
            email: '',
            phone: '',
            address: '',
          },
      items,
      currency,
      taxRate,
      notes,
      sourceDevisNumber,
      sourceDevisId,
      convertedFactureNumber,
      convertedFactureId,
      termsAndConditions: terms,
      amountInWords,
      previewOptions: { ...previewOptions, showDimensions, showDiscount },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="sticky top-14 sm:top-16 z-30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 glass-card p-3 sm:p-5">
        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
          <button
            onClick={handleCancel}
            className="p-2.5 text-slate-400 hover:text-brand-ink hover:bg-brand-mist rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="font-display text-base sm:text-xl font-bold text-brand-ink truncate">
              {isEditing ? `Modifier ${type === 'devis' ? 'le Devis' : 'la Facture'} ${number}` : `Nouveau ${type === 'devis' ? 'Devis' : 'Document'}`}
            </h2>
            <p className="hidden sm:block text-xs text-slate-500">Remplissez les éléments ci-dessous pour générer votre aperçu PDF</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center flex-1 sm:flex-none">
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'edit' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Formulaire</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'preview' ? 'bg-brand-ink text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Aperçu</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-4 sm:px-5 py-2.5 bg-brand-ink hover:bg-brand-deep disabled:opacity-60 text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 text-sm cursor-pointer shrink-0"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="sm:hidden">{isSaving ? '…' : 'Sauver'}</span>
            <span className="hidden sm:inline">{isSaving ? 'Enregistrement…' : 'Enregistrer'}</span>
          </button>
        </div>
      </div>

      {saveError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm font-medium">
          {saveError}
        </div>
      )}

      {activeTab === 'preview' ? (
        <DocumentPDFPreview
          document={constructPreviewDocument()}
          businessProfile={businessProfile}
          onUpdatePreviewOptions={(opts) => {
            setPreviewOptions(opts);
            if (opts.showDimensions !== undefined) setShowDimensions(opts.showDimensions);
            if (opts.showDiscount !== undefined) setShowDiscount(opts.showDiscount);
          }}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Document Details Card */}
          <div className="glass-card p-4 sm:p-6 space-y-5 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-5 sm:pb-6 border-b border-slate-100">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Type de document
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      if (type !== 'facture') setType('facture');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      type === 'facture' ? 'bg-brand-ink text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Facture
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (type !== 'devis') setType('devis');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      type === 'devis' ? 'bg-brand-ink text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Devis
                  </button>
                </div>
                {type === 'devis' && (
                  <button
                    type="button"
                    onClick={() => {
                      const oldDevisNum = number;
                      setType('facture');
                      setStatus('en_attente');
                      setSourceDevisNumber(oldDevisNum);
                      if (documentToEdit) {
                        setSourceDevisId(documentToEdit.id);
                      }
                      const mentionDevis = `Facture issue du devis n° ${oldDevisNum}`;
                      if (!notes.includes(mentionDevis)) {
                        setNotes((prev) => (prev ? `${mentionDevis}\n${prev}` : mentionDevis));
                      }
                    }}
                    className="mt-2 w-full py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 text-purple-600" />
                    <span>Convertir en Facture</span>
                  </button>
                )}
              </div>

              {/* Number */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    N° de Document
                  </label>
                  <button
                    type="button"
                    onClick={() => generateDocumentNumber(type).then(setNumber)}
                    title="Générer automatiquement le numéro séquentiel unique suivant"
                    className="text-[11px] font-bold text-brand-mid hover:text-brand-ink hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Auto-Numéro</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-slate-900 font-mono text-sm font-bold focus:outline-none focus:ring-2 ${
                      isNumberUnique
                        ? 'border-slate-200 focus:ring-brand-mid'
                        : 'border-rose-300 bg-rose-50/50 text-rose-900 focus:ring-rose-500'
                    }`}
                  />
                  {isNumberUnique ? (
                    <span className="absolute right-2.5 top-2.5 text-brand-mid flex items-center gap-1 text-[10px] font-extrabold bg-brand-mist px-1.5 py-0.5 rounded-md border border-brand-mid/25">
                      <ShieldCheck className="w-3 h-3" /> Unique
                    </span>
                  ) : (
                    <span className="absolute right-2.5 top-2.5 text-rose-600 flex items-center gap-1 text-[10px] font-extrabold bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200">
                      <AlertTriangle className="w-3 h-3" /> Déjà existant
                    </span>
                  )}
                </div>
                {!isNumberUnique && (
                  <p className="text-[11px] font-bold text-rose-600 mt-1">
                    ⚠️ Ce numéro existe déjà. Cliquez sur "Auto-Numéro" pour en attribuer un unique.
                  </p>
                )}
                {sourceDevisNumber && (
                  <p className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 mt-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Facture issue du devis n° {sourceDevisNumber}</span>
                  </p>
                )}
                {convertedFactureNumber && (
                  <p className="text-[11px] font-bold text-brand-ink bg-brand-mist px-2.5 py-1 rounded-lg border border-brand-mid/25 mt-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-mid" />
                    <span>Devis converti — Facture rattachée n° {convertedFactureNumber}</span>
                  </p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Statut
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as DocumentStatus)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid font-bold"
                >
                  <optgroup label="Facturation & Règlement">
                    <option value="payee">Payé / Réglé</option>
                    <option value="en_attente_paiement">En attente de paiement</option>
                    <option value="en_attente">En attente</option>
                    <option value="en_retard">En retard</option>
                  </optgroup>
                  <optgroup label="Suivi de Commande & Pose">
                    <option value="commande">Commandé</option>
                    <option value="en_cours">En fabrication / En cours</option>
                    <option value="pose">Posé / Installé</option>
                    <option value="livre">Livré</option>
                  </optgroup>
                  <optgroup label="Devis & Validation">
                    <option value="accepte">Accepté par le client</option>
                    <option value="refuse">Refusé</option>
                    <option value="brouillon">Brouillon</option>
                    <option value="converti">Converti en facture</option>
                    <option value="annulee">Annulée</option>
                  </optgroup>
                </select>
              </div>

              {/* Currency */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Devise
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid font-bold"
                >
                  <option value="FCFA">FCFA (Francs CFA)</option>
                  <option value="XOF">XOF (UEMOA)</option>
                  <option value="XAF">XAF (CEMAC)</option>
                </select>
              </div>
            </div>

            {/* Dates & Client Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Client Selector */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Client Destinataire *
                  </label>
                  <button
                    type="button"
                    onClick={onQuickAddClient}
                    className="text-[11px] font-semibold text-brand-mid hover:underline cursor-pointer"
                  >
                    + Ajouter client
                  </button>
                </div>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid font-medium"
                >
                  {clients.map((cli) => {
                    const isEnt = cli.clientType === 'entreprise' || (!cli.clientType && !!cli.companyName);
                    const categoryLabel = isEnt ? '[Entreprise]' : '[Particulier]';
                    const displayName = isEnt && cli.companyName ? `${cli.companyName} (${cli.name})` : cli.name;
                    return (
                      <option key={cli.id} value={cli.id}>
                        {categoryLabel} {displayName}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Date d'émission */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Date d'émission
                </label>
                <FrenchDateInput
                  value={date}
                  onChange={setDate}
                  className="w-full px-3 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid"
                />
              </div>

              {/* Date d'échéance */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  {type === 'devis' ? 'Date de validité' : 'Date d\'échéance'}
                </label>
                <FrenchDateInput
                  value={dueDate}
                  onChange={setDueDate}
                  className="w-full px-3 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Items Table */}
          <div className="glass-card p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Articles & Prestations</h3>
              
              {/* TVA Rate Controls */}
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Taux TVA globale :</span>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={taxRate}
                      onChange={(e) => {
                        const newRate = Math.max(0, Number(e.target.value));
                        setTaxRate(newRate);
                        setItems(items.map((it) => ({ ...it, taxRate: newRate })));
                      }}
                      className="w-20 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-mid"
                    />
                    <span className="absolute right-2 text-xs font-bold text-slate-500 pointer-events-none">%</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {[18, 20, 0, 5].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setTaxRate(preset);
                          setItems(items.map((it) => ({ ...it, taxRate: preset })));
                        }}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                          taxRate === preset
                            ? 'bg-brand-ink text-white shadow-2xs'
                            : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Dimension / Remise Columns Toggle & Formula Helper Info Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-slate-700">Colonnes du tableau :</span>
                <button
                  type="button"
                  onClick={() => {
                    const nextState = !showDimensions;
                    setShowDimensions(nextState);
                    setPreviewOptions((prev) => ({ ...prev, showDimensions: nextState }));
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    showDimensions
                      ? 'bg-indigo-600 text-white shadow-2xs hover:bg-indigo-700'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 shadow-2xs'
                  }`}
                >
                  <Ruler className="w-3.5 h-3.5" />
                  <span>{showDimensions ? 'Masquer Hauteur & Largeur' : 'Ajouter Hauteur & Largeur'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextState = !showDiscount;
                    setShowDiscount(nextState);
                    setPreviewOptions((prev) => ({ ...prev, showDiscount: nextState }));
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    showDiscount
                      ? 'bg-indigo-600 text-white shadow-2xs hover:bg-indigo-700'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 shadow-2xs'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  <span>{showDiscount ? 'Masquer Remise' : 'Afficher Remise'}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-medium">
                {showDimensions && (
                  <div className="text-brand-ink bg-brand-mist px-3 py-1 rounded-xl border border-brand-mid/25/90 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-brand-ink text-white rounded font-bold text-[9px] uppercase tracking-wider">Formule P.U.</span>
                    <span>Calcul auto : <strong>((Largeur × Hauteur) / 1 000 000) × Prix Client</strong></span>
                  </div>
                )}
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <span className="inline-block w-3.5 h-3.5 rounded-[2px] border-2 border-slate-900 bg-brand-glow shrink-0" />
                  Carré bleu à droite de chaque case → maintenir et tirer pour recopier.
                </span>
              </div>
            </div>

            {/* Tableau lignes — toujours visible (scroll horizontal si besoin) pour garder les poignées Excel */}
            <p className="sm:hidden text-[11px] text-slate-500 font-medium -mt-1 mb-1">
              Faites glisser horizontalement pour voir toutes les colonnes et les carrés bleus.
            </p>
            <div className={`overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200 ${fillDrag ? 'select-none cursor-crosshair' : ''}`}>
              <table className="w-full min-w-[720px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-2 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Description</th>
                    {showDimensions && (
                      <>
                        <th className="py-2.5 px-2 w-28 text-center">Hauteur (mm)</th>
                        <th className="py-2.5 px-2 w-28 text-center">Largeur (mm)</th>
                        <th className="py-2.5 px-2 w-28 text-center bg-brand-mist/80 text-brand-ink border-x border-brand-mid/25/60 font-bold">
                          Prix Client
                        </th>
                      </>
                    )}
                    <th className="py-2.5 px-2 w-16 text-center">Qté</th>
                    <th className="py-2.5 px-3 w-28 text-right">P.U. HT ({currency})</th>
                    {showDiscount && <th className="py-2.5 px-2 w-16 text-center">Remise (%)</th>}
                    <th className="py-2.5 px-3 w-28 text-right">Total HT</th>
                    <th className="py-2.5 px-2 w-8 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {items.map((item, rowIndex) => {
                    const lineHT = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);

                    return (
                      <tr key={item.id} data-item-row-index={rowIndex}>
                        <td className="py-2.5 px-2 text-center text-[11px] font-black text-slate-400 tabular-nums">
                          {rowIndex + 1}
                        </td>
                        <FillableCell
                          field="description"
                          rowIndex={rowIndex}
                          value={item.description}
                          fillDrag={fillDrag}
                          onFillStart={handleFillStart}
                          className="py-2.5 px-2"
                        >
                          <input
                            type="text"
                            required
                            placeholder="Ex: Store Vénitien Alu..."
                            value={item.description}
                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-mid"
                          />
                        </FillableCell>
                        {showDimensions && (
                          <>
                            <FillableCell
                              field="length"
                              rowIndex={rowIndex}
                              value={item.length}
                              fillDrag={fillDrag}
                              onFillStart={handleFillStart}
                              className="py-2.5 px-1.5"
                            >
                              <input
                                type="text"
                                placeholder="ex: 2400"
                                value={item.length ?? ''}
                                onChange={(e) => handleItemChange(item.id, 'length', e.target.value)}
                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs text-center font-mono focus:outline-none focus:ring-2 focus:ring-brand-mid"
                              />
                            </FillableCell>
                            <FillableCell
                              field="width"
                              rowIndex={rowIndex}
                              value={item.width}
                              fillDrag={fillDrag}
                              onFillStart={handleFillStart}
                              className="py-2.5 px-1.5"
                            >
                              <input
                                type="text"
                                placeholder="ex: 1600"
                                value={item.width ?? ''}
                                onChange={(e) => handleItemChange(item.id, 'width', e.target.value)}
                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs text-center font-mono focus:outline-none focus:ring-2 focus:ring-brand-mid"
                              />
                            </FillableCell>
                            <FillableCell
                              field="clientPrice"
                              rowIndex={rowIndex}
                              value={item.clientPrice}
                              fillDrag={fillDrag}
                              onFillStart={handleFillStart}
                              className="py-2.5 px-1.5 bg-brand-mist/30 border-x border-blue-100"
                            >
                              <input
                                type="number"
                                min="0"
                                step="500"
                                placeholder="ex: 25000"
                                value={item.clientPrice ?? ''}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.id,
                                    'clientPrice',
                                    e.target.value === '' ? '' : Number(e.target.value)
                                  )
                                }
                                className="w-full px-2 py-1.5 bg-white border border-brand-mid/35 rounded-lg text-brand-ink font-mono font-extrabold text-xs text-right focus:outline-none focus:ring-2 focus:ring-brand-mid shadow-2xs"
                              />
                            </FillableCell>
                          </>
                        )}
                        <FillableCell
                          field="quantity"
                          rowIndex={rowIndex}
                          value={item.quantity}
                          fillDrag={fillDrag}
                          onFillStart={handleFillStart}
                          className="py-2.5 px-1.5"
                        >
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(item.id, 'quantity', Math.max(1, Number(e.target.value)))
                            }
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs text-center font-semibold focus:outline-none focus:ring-2 focus:ring-brand-mid"
                          />
                        </FillableCell>
                        <FillableCell
                          field="unitPrice"
                          rowIndex={rowIndex}
                          value={item.unitPrice}
                          fillDrag={fillDrag}
                          onFillStart={handleFillStart}
                          className="py-2.5 px-2"
                        >
                          <input
                            type="number"
                            min="0"
                            step="500"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value))}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-mono font-bold text-right focus:outline-none focus:ring-2 focus:ring-brand-mid"
                          />
                        </FillableCell>
                        {showDiscount && (
                          <FillableCell
                            field="discount"
                            rowIndex={rowIndex}
                            value={item.discount}
                            fillDrag={fillDrag}
                            onFillStart={handleFillStart}
                            className="py-2.5 px-1.5"
                          >
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discount}
                              onChange={(e) => handleItemChange(item.id, 'discount', Number(e.target.value))}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs text-center font-mono focus:outline-none focus:ring-2 focus:ring-brand-mid"
                            />
                          </FillableCell>
                        )}
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900 text-xs">
                          {formatFCFA(lineHT, '')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={items.length === 1}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full sm:w-auto px-3.5 py-2.5 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-brand-mid" />
                <span>Ajouter une ligne</span>
              </button>

              <div className="w-full sm:w-auto sm:min-w-[240px] text-right space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Sous-total HT :</span>
                  <span className="font-mono font-semibold">{formatFCFA(totals.totalHT, currency)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>TVA ({taxRate}%) :</span>
                  <span className="font-mono font-semibold">{formatFCFA(totals.totalTVA, currency)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>TOTAL TTC :</span>
                  <span className="font-mono text-brand-ink font-extrabold">{formatFCFA(totals.totalTTC, currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Auto Amount in Words Preview Banner */}
          <div className="p-4 bg-brand-mist/70 rounded-2xl border border-blue-100 text-xs text-brand-ink">
            <span className="font-bold">Conversion automatique du montant en toutes lettres :</span>
            <p className="mt-1 font-semibold italic text-slate-800">« {amountInWords} »</p>
          </div>

          {/* Terms & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 glass-card p-4 sm:p-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Notes / Remarques au client
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Merci pour votre confiance..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-mid"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Conditions de paiement & Mentions légales
              </label>
              <textarea
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Ex: Paiement sous 15 jours par virement bancaire..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-brand-mid"
              />
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
