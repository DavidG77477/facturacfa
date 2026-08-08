import React from 'react';
import {
  Download,
  Printer,
  Copy,
  Check,
  User,
  CreditCard,
  ShieldCheck,
  Edit3,
  MapPin,
  Phone,
  Mail,
  FileCheck2,
  Calendar,
  Sparkles,
  Info,
  RefreshCw,
  CopyPlus,
  SlidersHorizontal,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  Move,
  Stamp,
  PenTool,
  Ruler,
  Percent,
  Image as ImageIcon,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { BusinessProfile, InvoiceDocument, DocumentPreviewOptions, isSectionItem } from '../../types';
import { formatFCFA, calculateDocumentTotals, numberToWordsFR } from '../../utils/currency';
import {
  downloadPDF,
  preparePdfVisualPreview,
  disposePdfVisualPreview,
  printPDF,
  type PdfLayoutMeasure,
} from '../../utils/pdfGenerator';
import { getStatusInfo } from '../../utils/status';
import { formatDateFR } from '../../utils/date';
import { PdfPageBreakModal, type PdfPlannerConfirmMode } from './PdfPageBreakModal';

interface DocumentPDFPreviewProps {
  document: InvoiceDocument;
  businessProfile: BusinessProfile;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onConvertDevisToFacture?: () => void;
  onUpdatePreviewOptions?: (options: DocumentPreviewOptions) => void;
}

export const DocumentPDFPreview: React.FC<DocumentPDFPreviewProps> = ({
  document: doc,
  businessProfile: profile,
  onEdit,
  onDuplicate,
  onConvertDevisToFacture,
  onUpdatePreviewOptions,
}) => {
  const paperRef = React.useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [downloadSuccess, setDownloadSuccess] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);

  const [activeDrag, setActiveDrag] = React.useState<'stamp' | 'signature' | null>(null);
  const [activeRotate, setActiveRotate] = React.useState<'stamp' | 'signature' | null>(null);
  const [dragOffset, setDragOffset] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const activePointersRef = React.useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRotateRef = React.useRef<{
    type: 'stamp' | 'signature';
    startAngle: number;
    startRotation: number;
  } | null>(null);

  const normalizeRotation = (deg: number) => {
    const n = ((Math.round(deg) % 360) + 360) % 360;
    return n > 180 ? n - 360 : n;
  };

  const angleBetweenPointers = (
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

  // Custom Preview Options state with defaults
  const [options, setOptions] = React.useState<Required<DocumentPreviewOptions>>({
    showContactName: doc.previewOptions?.showContactName ?? true,
    showClientNif: doc.previewOptions?.showClientNif ?? true,
    showClientPhoneEmail: doc.previewOptions?.showClientPhoneEmail ?? true,
    showClientAddress: doc.previewOptions?.showClientAddress ?? true,
    showPaymentDetails: doc.previewOptions?.showPaymentDetails ?? false, // Masqué par défaut
    showAmountInWords: doc.previewOptions?.showAmountInWords ?? true,
    showSignatures: doc.previewOptions?.showSignatures ?? true,
    showStamp: doc.previewOptions?.showStamp ?? true,
    showSignature: doc.previewOptions?.showSignature ?? true,
    showDimensions: doc.previewOptions?.showDimensions ?? doc.items.some(item => Boolean(item.length || item.width)),
    showDiscount: doc.previewOptions?.showDiscount ?? true,
    stampPosition: doc.previewOptions?.stampPosition ?? { x: 55, y: 81, width: 130 },
    signaturePosition: doc.previewOptions?.signaturePosition ?? { x: 72, y: 83, width: 140 },
    logoWidth: doc.previewOptions?.logoWidth ?? 120,
    pageBreakAfterModules: doc.previewOptions?.pageBreakAfterModules ?? [],
    pullToPreviousPageModules: doc.previewOptions?.pullToPreviousPageModules ?? [],
    hiddenPdfPageStarts: doc.previewOptions?.hiddenPdfPageStarts ?? [],
  });

  const [showOptionsBar, setShowOptionsBar] = React.useState(false);
  const [showPageBreakModal, setShowPageBreakModal] = React.useState(false);
  const [plannerMode, setPlannerMode] = React.useState<PdfPlannerConfirmMode>('download');
  const [pdfLayout, setPdfLayout] = React.useState<PdfLayoutMeasure | null>(null);
  const [isCapturingPreview, setIsCapturingPreview] = React.useState(false);
  const optionsRef = React.useRef(options);
  React.useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Sync when parent document preview options change after a save
  React.useEffect(() => {
    setOptions((prev) => ({
      ...prev,
      showContactName: doc.previewOptions?.showContactName ?? prev.showContactName,
      showClientNif: doc.previewOptions?.showClientNif ?? prev.showClientNif,
      showClientPhoneEmail: doc.previewOptions?.showClientPhoneEmail ?? prev.showClientPhoneEmail,
      showClientAddress: doc.previewOptions?.showClientAddress ?? prev.showClientAddress,
      showPaymentDetails: doc.previewOptions?.showPaymentDetails ?? prev.showPaymentDetails,
      showAmountInWords: doc.previewOptions?.showAmountInWords ?? prev.showAmountInWords,
      showSignatures: doc.previewOptions?.showSignatures ?? prev.showSignatures,
      showStamp: doc.previewOptions?.showStamp ?? prev.showStamp,
      showSignature: doc.previewOptions?.showSignature ?? prev.showSignature,
      showDimensions: doc.previewOptions?.showDimensions ?? prev.showDimensions,
      showDiscount: doc.previewOptions?.showDiscount ?? prev.showDiscount,
      stampPosition: doc.previewOptions?.stampPosition ?? prev.stampPosition,
      signaturePosition: doc.previewOptions?.signaturePosition ?? prev.signaturePosition,
      logoWidth: doc.previewOptions?.logoWidth ?? prev.logoWidth ?? 120,
      pageBreakAfterModules:
        doc.previewOptions?.pageBreakAfterModules ?? prev.pageBreakAfterModules ?? [],
      pullToPreviousPageModules:
        doc.previewOptions?.pullToPreviousPageModules ?? prev.pullToPreviousPageModules ?? [],
      hiddenPdfPageStarts:
        doc.previewOptions?.hiddenPdfPageStarts ?? prev.hiddenPdfPageStarts ?? [],
    }));
  }, [doc.id, doc.updatedAt, doc.previewOptions]);

  const toggleOption = (key: keyof DocumentPreviewOptions) => {
    const updated = { ...optionsRef.current, [key]: !optionsRef.current[key] };
    optionsRef.current = updated as typeof options;
    setOptions(updated as typeof options);
    if (onUpdatePreviewOptions) {
      onUpdatePreviewOptions(updated);
    }
  };

  const persistOverlayPosition = (
    type: 'stamp' | 'signature',
    patch: Partial<{ x: number; y: number; width: number; rotation: number }>,
  ) => {
    const key = type === 'stamp' ? 'stampPosition' : 'signaturePosition';
    const updatedPos = { ...optionsRef.current[key], ...patch };
    const updatedOpts = { ...optionsRef.current, [key]: updatedPos };
    optionsRef.current = updatedOpts;
    setOptions(updatedOpts);
  };

  const handlePointerDown = (type: 'stamp' | 'signature', e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    if (!paperRef.current) return;

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const pointers = [...activePointersRef.current.values()];
    if (pointers.length >= 2) {
      // Deux doigts : rotation (tactile)
      setActiveDrag(null);
      const startAngle = angleBetweenPointers(pointers[0], pointers[1]);
      const currentPos = type === 'stamp' ? optionsRef.current.stampPosition : optionsRef.current.signaturePosition;
      pinchRotateRef.current = {
        type,
        startAngle,
        startRotation: currentPos.rotation || 0,
      };
      setActiveRotate(type);
      return;
    }

    const rect = paperRef.current.getBoundingClientRect();
    const currentPos = type === 'stamp' ? optionsRef.current.stampPosition : optionsRef.current.signaturePosition;
    const elemLeftPx = rect.left + (currentPos.x / 100) * rect.width;
    const elemTopPx = rect.top + (currentPos.y / 100) * rect.height;

    setDragOffset({
      x: e.clientX - elemLeftPx,
      y: e.clientY - elemTopPx,
    });
    setActiveDrag(type);
    setActiveRotate(null);
    pinchRotateRef.current = null;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!paperRef.current) return;
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    const pointers = [...activePointersRef.current.values()];
    if (pointers.length >= 2 && pinchRotateRef.current) {
      const currentAngle = angleBetweenPointers(pointers[0], pointers[1]);
      const { type, startAngle, startRotation } = pinchRotateRef.current;
      const next = normalizeRotation(startRotation + (currentAngle - startAngle));
      persistOverlayPosition(type, { rotation: next });
      return;
    }

    if (!activeDrag) return;
    const rect = paperRef.current.getBoundingClientRect();

    let newX = ((e.clientX - dragOffset.x - rect.left) / rect.width) * 100;
    let newY = ((e.clientY - dragOffset.y - rect.top) / rect.height) * 100;

    newX = Math.max(0, Math.min(84, newX));
    newY = Math.max(0, Math.min(92, newY));

    persistOverlayPosition(activeDrag, {
      x: Math.round(newX * 10) / 10,
      y: Math.round(newY * 10) / 10,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    try {
      if ((e.currentTarget as HTMLElement).hasPointerCapture?.(e.pointerId)) {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch {
      /* ignore */
    }

    if (activePointersRef.current.size < 2) {
      pinchRotateRef.current = null;
      setActiveRotate(null);
    }

    if (activePointersRef.current.size === 0 && (activeDrag || activeRotate)) {
      setActiveDrag(null);
      setActiveRotate(null);
      if (onUpdatePreviewOptions) {
        onUpdatePreviewOptions(optionsRef.current);
      }
    }
  };

  const handleWidthChange = (type: 'stamp' | 'signature' | 'logo', delta: number) => {
    if (type === 'logo') {
      const currentW = options.logoWidth || 120;
      const newW = Math.max(60, Math.min(360, currentW + delta));
      const updated = { ...options, logoWidth: newW };
      setOptions(updated);
      if (onUpdatePreviewOptions) onUpdatePreviewOptions(updated);
      return;
    }
    if (type === 'stamp') {
      const currentW = options.stampPosition.width || 130;
      const newW = Math.max(70, Math.min(250, currentW + delta));
      const updated = { ...options, stampPosition: { ...options.stampPosition, width: newW } };
      optionsRef.current = updated;
      setOptions(updated);
      if (onUpdatePreviewOptions) onUpdatePreviewOptions(updated);
    } else {
      const currentW = options.signaturePosition.width || 140;
      const newW = Math.max(70, Math.min(250, currentW + delta));
      const updated = { ...options, signaturePosition: { ...options.signaturePosition, width: newW } };
      optionsRef.current = updated;
      setOptions(updated);
      if (onUpdatePreviewOptions) onUpdatePreviewOptions(updated);
    }
  };

  const handleRotationChange = (type: 'stamp' | 'signature', delta: number) => {
    const key = type === 'stamp' ? 'stampPosition' : 'signaturePosition';
    const current = optionsRef.current[key].rotation || 0;
    const updated = {
      ...optionsRef.current,
      [key]: { ...optionsRef.current[key], rotation: normalizeRotation(current + delta) },
    };
    optionsRef.current = updated;
    setOptions(updated);
    if (onUpdatePreviewOptions) onUpdatePreviewOptions(updated);
  };

  const handleRotationReset = (type: 'stamp' | 'signature') => {
    const key = type === 'stamp' ? 'stampPosition' : 'signaturePosition';
    const updated = {
      ...optionsRef.current,
      [key]: { ...optionsRef.current[key], rotation: 0 },
    };
    optionsRef.current = updated;
    setOptions(updated);
    if (onUpdatePreviewOptions) onUpdatePreviewOptions(updated);
  };

  const totals = calculateDocumentTotals(doc.items, doc.taxRate);
  const isDevis = doc.type === 'devis';
  const elementId = `pdf-preview-${doc.id}`;

  const amountInWords = doc.amountInWords || numberToWordsFR(totals.totalTTC, `Francs ${doc.currency || 'CFA'}`);
  const statusInfo = getStatusInfo(doc.status);

  const legalFooterBlock = (
    <>
      {(profile.nif || profile.rccm) && (
        <p className="font-mono font-semibold text-slate-600 text-center">
          {[profile.nif && `NIF : ${profile.nif}`, profile.rccm && `RCCM : ${profile.rccm}`]
            .filter(Boolean)
            .join('  ·  ')}
        </p>
      )}
      {profile.legalFooter && (
        <p className="font-semibold text-slate-500 whitespace-pre-line text-center">
          {profile.legalFooter}
        </p>
      )}
    </>
  );

  const openPdfPlanner = async (mode: PdfPlannerConfirmMode) => {
    if (isExporting || isCapturingPreview) return;
    setPlannerMode(mode);
    setShowPageBreakModal(true);
    setIsCapturingPreview(true);
    setPdfLayout(null);
    try {
      const layout = await preparePdfVisualPreview(elementId, doc.number);
      setPdfLayout(layout);
    } finally {
      setIsCapturingPreview(false);
    }
  };

  const closePdfPlanner = () => {
    if (isExporting) return;
    setShowPageBreakModal(false);
    disposePdfVisualPreview();
    setPdfLayout(null);
  };

  const patchPreviewOptions = (patch: Partial<DocumentPreviewOptions>) => {
    const updated = { ...optionsRef.current, ...patch };
    optionsRef.current = updated as typeof options;
    setOptions(updated as typeof options);
    if (onUpdatePreviewOptions) onUpdatePreviewOptions(updated);
  };

  const updatePageBreaks = (ids: string[]) => {
    patchPreviewOptions({ pageBreakAfterModules: ids });
  };

  const updatePagePulls = (ids: string[]) => {
    patchPreviewOptions({ pullToPreviousPageModules: ids });
  };

  const updateHiddenPages = (starts: number[]) => {
    patchPreviewOptions({ hiddenPdfPageStarts: starts });
  };

  const confirmPlannerAction = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setDownloadSuccess(false);
    const layoutOpts = {
      breakAfterModuleIds: optionsRef.current.pageBreakAfterModules || [],
      pullToPreviousModuleIds: optionsRef.current.pullToPreviousPageModules || [],
      hiddenPageStarts: optionsRef.current.hiddenPdfPageStarts || [],
      documentNumber: doc.number,
    };
    try {
      if (plannerMode === 'print') {
        const success = await printPDF(elementId, layoutOpts);
        if (success) {
          setShowPageBreakModal(false);
          disposePdfVisualPreview();
          setPdfLayout(null);
        }
        return;
      }

      const clientNameClean = (doc.clientInfo.companyName || doc.clientInfo.name || 'client').replace(
        /\s+/g,
        '_'
      );
      const success = await downloadPDF(
        elementId,
        `${doc.type}_${doc.number}_${clientNameClean}`,
        layoutOpts
      );
      if (success) {
        setShowPageBreakModal(false);
        disposePdfVisualPreview();
        setPdfLayout(null);
        setDownloadSuccess(true);
        window.setTimeout(() => setDownloadSuccess(false), 3000);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopySummary = () => {
    const text = `${isDevis ? 'DEVIS' : 'FACTURE'} N° ${doc.number} - ${doc.clientInfo.name}\nTotal TTC : ${formatFCFA(totals.totalTTC, doc.currency)}\nDate : ${formatDateFR(doc.date)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check if dimensions (length and width) are enabled for display
  const hasDimensions = options.showDimensions;
  const hasDiscount = options.showDiscount;

  return (
    <div className="space-y-5">
      <PdfPageBreakModal
        open={showPageBreakModal}
        layout={pdfLayout}
        breakAfterModuleIds={options.pageBreakAfterModules || []}
        pullToPreviousModuleIds={options.pullToPreviousPageModules || []}
        hiddenPageStarts={options.hiddenPdfPageStarts || []}
        onChangeBreaks={updatePageBreaks}
        onChangePulls={updatePagePulls}
        onChangeHiddenPages={updateHiddenPages}
        onConfirm={confirmPlannerAction}
        onClose={closePdfPlanner}
        isExporting={isExporting}
        isCapturingPreview={isCapturingPreview}
        documentLabel={`${isDevis ? 'Devis' : 'Facture'} ${doc.number}`}
        confirmMode={plannerMode}
      />

      {/* Top Action Toolbar */}
      <div className="flex flex-col gap-3 bg-brand-ink text-brand-paper p-3 sm:p-4 rounded-2xl border border-brand-deep sticky top-[4.5rem] sm:top-[5.25rem] z-30">
        <div className="flex flex-wrap items-center gap-2">
          <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
            isDevis ? 'bg-sky-600/90 text-white' : 'bg-brand-mid text-white'
          }`}>
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>{isDevis ? 'Aperçu Devis' : 'Aperçu Facture'}</span>
          </div>

          <span className="font-mono font-bold text-sm text-brand-paper bg-brand-deep/70 px-2.5 py-0.5 rounded-lg border border-white/10">
            {doc.number}
          </span>

          {/* Status badge in preview toolbar */}
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${statusInfo.pdfBgClass}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
            <span>{statusInfo.label}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2">
          {/* Customization Options Toggle Button */}
          <button
            onClick={() => setShowOptionsBar(!showOptionsBar)}
            className={`px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
              showOptionsBar
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-brand-deep/70 hover:bg-brand-mid/40 text-amber-300 border-amber-500/25'
            }`}
            title="Choisir les informations à afficher ou masquer sur le document"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="sm:hidden">Options</span>
            <span className="hidden sm:inline">Personnaliser l'affichage</span>
          </button>

          {isDevis && onConvertDevisToFacture && (
            <button
              onClick={onConvertDevisToFacture}
              className="px-3.5 py-2.5 sm:py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.35)]"
              title="Convertir ce devis en Facture"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-950" />
              <span className="sm:hidden">→ Facture</span>
              <span className="hidden sm:inline">Convertir en Facture</span>
            </button>
          )}

          {onDuplicate && (
            <button
              onClick={onDuplicate}
              className="px-3.5 py-2.5 sm:py-2 bg-brand-deep/70 hover:bg-brand-mid/40 text-brand-sand hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
              title="Dupliquer ce document"
            >
              <CopyPlus className="w-3.5 h-3.5 text-brand-sand/50" />
              <span>Dupliquer</span>
            </button>
          )}

          {onEdit && (
            <button
              onClick={onEdit}
              className="px-3.5 py-2.5 sm:py-2 bg-brand-deep/70 hover:bg-brand-mid/40 text-brand-sand hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
            >
              <Edit3 className="w-3.5 h-3.5 text-brand-sand/50" />
              <span>Modifier</span>
            </button>
          )}

          <button
            onClick={handleCopySummary}
            className="px-3.5 py-2.5 sm:py-2 bg-brand-deep/70 hover:bg-brand-mid/40 text-brand-sand hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-brand-glow" /> : <Copy className="w-3.5 h-3.5 text-brand-sand/50" />}
            <span className="sm:hidden">{copied ? 'Copié' : 'Résumé'}</span>
            <span className="hidden sm:inline">{copied ? 'Copié !' : 'Copier résumé'}</span>
          </button>

          <button
            onClick={() => openPdfPlanner('print')}
            disabled={isExporting || isCapturingPreview}
            className="px-3.5 py-2.5 sm:py-2 bg-brand-deep/70 hover:bg-brand-mid/40 text-brand-sand hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/10 disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5 text-brand-sand/50" />
            <span>Imprimer</span>
          </button>

          <button
            onClick={() => openPdfPlanner('download')}
            disabled={isExporting || isCapturingPreview}
            className={`col-span-2 sm:col-span-1 px-4 py-3 sm:py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border shadow-[0_0_18px_rgba(45,212,191,0.4)] ${
              downloadSuccess
                ? 'bg-emerald-300 border-emerald-200'
                : 'bg-brand-glow hover:bg-teal-300 border-teal-200/80'
            }`}
            style={{ color: '#042f2e' }}
          >
            {downloadSuccess ? (
              <>
                <Check className="w-4 h-4" style={{ color: '#042f2e' }} />
                <span>PDF Téléchargé !</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" style={{ color: '#042f2e' }} />
                <span className="sm:hidden">{isExporting ? 'Génération…' : 'PDF'}</span>
                <span className="hidden sm:inline">{isExporting ? 'Génération…' : 'Préparer le PDF'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive Display Options Bar */}
      {showOptionsBar && (
        <div className="bg-amber-500/10 border-2 border-amber-400/80 p-4 rounded-2xl animate-fade-in space-y-3">
          <div className="flex items-center justify-between border-b border-amber-300/40 pb-2">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xs">
              <SlidersHorizontal className="w-4 h-4 text-amber-600" />
              <span>INFORMATIONS À AFFICHER SUR LE PREVIEW / IMPRESSION :</span>
            </div>
            <button
              onClick={() => setShowOptionsBar(false)}
              className="text-[10px] text-slate-500 hover:text-slate-900 font-bold underline cursor-pointer"
            >
              Fermer le panneau
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {/* Nom du contact entreprise */}
            <button
              type="button"
              onClick={() => toggleOption('showContactName')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                options.showContactName
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {options.showContactName ? <CheckSquare className="w-4 h-4 text-slate-950 shrink-0" /> : <Square className="w-4 h-4 text-slate-400 shrink-0" />}
              <span className="text-left leading-tight">Nom contact (À l'attention de)</span>
            </button>

            {/* Identifiant fiscal client (NIF/RCCM) */}
            <button
              type="button"
              onClick={() => toggleOption('showClientNif')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                options.showClientNif
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {options.showClientNif ? <CheckSquare className="w-4 h-4 text-slate-950 shrink-0" /> : <Square className="w-4 h-4 text-slate-400 shrink-0" />}
              <span className="text-left leading-tight">NIF / Identifiant Client</span>
            </button>

            {/* Moyen de paiement & RIB */}
            <button
              type="button"
              onClick={() => toggleOption('showPaymentDetails')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                options.showPaymentDetails
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {options.showPaymentDetails ? <CheckSquare className="w-4 h-4 text-slate-950 shrink-0" /> : <Square className="w-4 h-4 text-slate-400 shrink-0" />}
              <span className="text-left leading-tight">Moyen de paiement & RIB</span>
            </button>

            {/* Adresse Client */}
            <button
              type="button"
              onClick={() => toggleOption('showClientAddress')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                options.showClientAddress
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {options.showClientAddress ? <CheckSquare className="w-4 h-4 text-slate-950 shrink-0" /> : <Square className="w-4 h-4 text-slate-400 shrink-0" />}
              <span className="text-left leading-tight">Adresse du client</span>
            </button>

            {/* Téléphone & Email Client */}
            <button
              type="button"
              onClick={() => toggleOption('showClientPhoneEmail')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                options.showClientPhoneEmail
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {options.showClientPhoneEmail ? <CheckSquare className="w-4 h-4 text-slate-950 shrink-0" /> : <Square className="w-4 h-4 text-slate-400 shrink-0" />}
              <span className="text-left leading-tight">Tél. & Email Client</span>
            </button>

            {/* Montant en toutes lettres */}
            <button
              type="button"
              onClick={() => toggleOption('showAmountInWords')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                options.showAmountInWords
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {options.showAmountInWords ? <CheckSquare className="w-4 h-4 text-slate-950 shrink-0" /> : <Square className="w-4 h-4 text-slate-400 shrink-0" />}
              <span className="text-left leading-tight">Montant en lettres</span>
            </button>

            {/* Signatures Block */}
            <button
              type="button"
              onClick={() => toggleOption('showSignatures')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                options.showSignatures
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {options.showSignatures ? <CheckSquare className="w-4 h-4 text-slate-950 shrink-0" /> : <Square className="w-4 h-4 text-slate-400 shrink-0" />}
              <span className="text-left leading-tight">Cadre Signatures</span>
            </button>

            {/* Taille du logo */}
            {profile.logoUrl && (
              <div className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/80 text-xs font-bold flex items-center gap-2 col-span-1 sm:col-span-2">
                <ImageIcon className="w-4 h-4 text-blue-700 shrink-0" />
                <span className="text-slate-800 shrink-0">Taille logo</span>
                <button
                  type="button"
                  onClick={() => handleWidthChange('logo', -20)}
                  className="w-7 h-7 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg flex items-center justify-center font-black text-sm cursor-pointer text-slate-700"
                  title="Réduire le logo"
                >
                  -
                </button>
                <span className="font-mono text-blue-900 min-w-[3.5rem] text-center">{options.logoWidth || 120}px</span>
                <button
                  type="button"
                  onClick={() => handleWidthChange('logo', 20)}
                  className="w-7 h-7 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg flex items-center justify-center font-black text-sm cursor-pointer text-slate-700"
                  title="Agrandir le logo"
                >
                  +
                </button>
              </div>
            )}

            {/* Cachet Officiel (Stamp) */}
            <button
              type="button"
              onClick={() => toggleOption('showStamp')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                options.showStamp
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {options.showStamp ? <CheckSquare className="w-4 h-4 text-slate-950 shrink-0" /> : <Square className="w-4 h-4 text-slate-400 shrink-0" />}
              <Stamp className="w-4 h-4 text-indigo-700 shrink-0" />
              <span className="text-left leading-tight">Apposer Cachet</span>
            </button>

            {/* Signature Numérique */}
            <button
              type="button"
              onClick={() => toggleOption('showSignature')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                options.showSignature
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {options.showSignature ? <CheckSquare className="w-4 h-4 text-slate-950 shrink-0" /> : <Square className="w-4 h-4 text-slate-400 shrink-0" />}
              <PenTool className="w-4 h-4 text-blue-700 shrink-0" />
              <span className="text-left leading-tight">Apposer Signature</span>
            </button>

            {/* Colonnes Dimensions (Hauteur & Largeur) */}
            <button
              type="button"
              onClick={() => toggleOption('showDimensions')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                options.showDimensions
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {options.showDimensions ? <CheckSquare className="w-4 h-4 text-slate-950 shrink-0" /> : <Square className="w-4 h-4 text-slate-400 shrink-0" />}
              <Ruler className="w-4 h-4 text-blue-700 shrink-0" />
              <span className="text-left leading-tight">Colonnes Largeur / Hauteur</span>
            </button>

            {/* Colonne Remise */}
            <button
              type="button"
              onClick={() => toggleOption('showDiscount')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                options.showDiscount
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {options.showDiscount ? <CheckSquare className="w-4 h-4 text-slate-950 shrink-0" /> : <Square className="w-4 h-4 text-slate-400 shrink-0" />}
              <Percent className="w-4 h-4 text-blue-700 shrink-0" />
              <span className="text-left leading-tight">Colonne Remise</span>
            </button>
          </div>
        </div>
      )}

      {/* Printable Canvas Outer Container */}
      <p className="md:hidden text-[11px] text-slate-500 font-medium px-1">
        Faites glisser horizontalement pour voir tout le document A4.
      </p>
      <div className="bg-brand-mist/70 p-3 sm:p-8 rounded-2xl sm:rounded-3xl overflow-x-auto overscroll-x-contain border border-brand-ink/8 -mx-1 sm:mx-0">
        <div className="min-w-[794px] flex justify-center mx-auto">
        <div
          ref={paperRef}
          id={elementId}
          className={`bg-white text-slate-800 p-10 rounded-2xl shadow-2xl border border-slate-200/90 w-[794px] min-h-[1123px] flex flex-col justify-start font-sans text-xs leading-relaxed relative overflow-visible box-border ${
            isDevis ? 'border-t-[10px] border-t-sky-600' : 'border-t-[10px] border-t-blue-700'
          }`}
          style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
        >
          {/* Draggable / rotatable Stamp Overlay */}
          {options.showStamp && profile.stampUrl && (
            <div
              data-pdf-keep
              onPointerDown={(e) => handlePointerDown('stamp', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                position: 'absolute',
                left: `${options.stampPosition.x}%`,
                top: `${options.stampPosition.y}%`,
                width: `${options.stampPosition.width || 130}px`,
                maxWidth: `${options.stampPosition.width || 130}px`,
                zIndex: 30,
                touchAction: 'none',
                overflow: 'visible',
              }}
              className={`group select-none cursor-grab active:cursor-grabbing rounded-xl p-1 transition-shadow ${
                activeDrag === 'stamp' || activeRotate === 'stamp'
                  ? 'ring-2 ring-indigo-500 bg-indigo-50/30 shadow-lg'
                  : 'hover:ring-2 hover:ring-indigo-400/80 hover:bg-indigo-50/10'
              }`}
              title="1 doigt : déplacer · 2 doigts : pivoter · boutons : taille / rotation"
            >
              <img
                src={profile.stampUrl}
                alt="Cachet Officiel"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                className="w-full h-auto object-contain pointer-events-none opacity-90 mix-blend-multiply"
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  height: 'auto',
                  display: 'block',
                  objectFit: 'contain',
                  transform: `rotate(${options.stampPosition.rotation || 0}deg)`,
                  transformOrigin: 'center center',
                }}
              />

              {/* Controls — always visible on touch; hover on desktop */}
              <div
                className={`no-print transition-opacity absolute -top-14 sm:-top-11 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white text-[10px] font-bold px-2 py-1.5 rounded-xl shadow-lg flex flex-wrap items-center justify-center gap-1 max-w-[260px] pointer-events-auto z-40 ${
                  activeDrag === 'stamp' || activeRotate === 'stamp'
                    ? 'opacity-100'
                    : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'
                }`}
              >
                <Move className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="pr-0.5">Cachet</span>
                <div className="h-4 w-px bg-slate-700 mx-0.5" />
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleWidthChange('stamp', -10); }}
                  className="min-w-9 min-h-9 sm:min-w-7 sm:min-h-7 w-9 h-9 sm:w-7 sm:h-7 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg flex items-center justify-center font-black text-base sm:text-sm cursor-pointer text-slate-200 touch-manipulation"
                  title="Réduire taille"
                  aria-label="Réduire le cachet"
                >-</button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleWidthChange('stamp', 10); }}
                  className="min-w-9 min-h-9 sm:min-w-7 sm:min-h-7 w-9 h-9 sm:w-7 sm:h-7 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg flex items-center justify-center font-black text-base sm:text-sm cursor-pointer text-slate-200 touch-manipulation"
                  title="Agrandir taille"
                  aria-label="Agrandir le cachet"
                >+</button>
                <div className="h-4 w-px bg-slate-700 mx-0.5" />
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleRotationChange('stamp', -15); }}
                  className="min-w-9 min-h-9 sm:min-w-7 sm:min-h-7 w-9 h-9 sm:w-7 sm:h-7 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg flex items-center justify-center cursor-pointer text-slate-200 touch-manipulation"
                  title="Pivoter −15°"
                  aria-label="Pivoter le cachet à gauche"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleRotationReset('stamp'); }}
                  className="min-w-10 min-h-9 sm:min-w-8 sm:min-h-7 px-1.5 h-9 sm:h-7 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg flex items-center justify-center cursor-pointer text-amber-300 font-mono text-[11px] touch-manipulation"
                  title="Réinitialiser la rotation"
                  aria-label="Réinitialiser la rotation du cachet"
                >
                  {options.stampPosition.rotation || 0}°
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleRotationChange('stamp', 15); }}
                  className="min-w-9 min-h-9 sm:min-w-7 sm:min-h-7 w-9 h-9 sm:w-7 sm:h-7 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg flex items-center justify-center cursor-pointer text-slate-200 touch-manipulation"
                  title="Pivoter +15°"
                  aria-label="Pivoter le cachet à droite"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Draggable / rotatable Signature Overlay */}
          {options.showSignature && profile.signatureUrl && (
            <div
              data-pdf-keep
              onPointerDown={(e) => handlePointerDown('signature', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                position: 'absolute',
                left: `${options.signaturePosition.x}%`,
                top: `${options.signaturePosition.y}%`,
                width: `${options.signaturePosition.width || 140}px`,
                maxWidth: `${options.signaturePosition.width || 140}px`,
                zIndex: 35,
                touchAction: 'none',
                overflow: 'visible',
              }}
              className={`group select-none cursor-grab active:cursor-grabbing rounded-xl p-1 transition-shadow ${
                activeDrag === 'signature' || activeRotate === 'signature'
                  ? 'ring-2 ring-blue-500 bg-blue-50/30 shadow-lg'
                  : 'hover:ring-2 hover:ring-blue-400/80 hover:bg-blue-50/10'
              }`}
              title="1 doigt : déplacer · 2 doigts : pivoter · boutons : taille / rotation"
            >
              <img
                src={profile.signatureUrl}
                alt="Signature Numérique"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                className="w-full h-auto object-contain pointer-events-none mix-blend-multiply"
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  height: 'auto',
                  display: 'block',
                  objectFit: 'contain',
                  transform: `rotate(${options.signaturePosition.rotation || 0}deg)`,
                  transformOrigin: 'center center',
                }}
              />

              <div
                className={`no-print transition-opacity absolute -top-14 sm:-top-11 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white text-[10px] font-bold px-2 py-1.5 rounded-xl shadow-lg flex flex-wrap items-center justify-center gap-1 max-w-[260px] pointer-events-auto z-40 ${
                  activeDrag === 'signature' || activeRotate === 'signature'
                    ? 'opacity-100'
                    : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'
                }`}
              >
                <Move className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="pr-0.5">Signature</span>
                <div className="h-4 w-px bg-slate-700 mx-0.5" />
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleWidthChange('signature', -10); }}
                  className="min-w-9 min-h-9 sm:min-w-7 sm:min-h-7 w-9 h-9 sm:w-7 sm:h-7 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg flex items-center justify-center font-black text-base sm:text-sm cursor-pointer text-slate-200 touch-manipulation"
                  title="Réduire taille"
                  aria-label="Réduire la signature"
                >-</button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleWidthChange('signature', 10); }}
                  className="min-w-9 min-h-9 sm:min-w-7 sm:min-h-7 w-9 h-9 sm:w-7 sm:h-7 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg flex items-center justify-center font-black text-base sm:text-sm cursor-pointer text-slate-200 touch-manipulation"
                  title="Agrandir taille"
                  aria-label="Agrandir la signature"
                >+</button>
                <div className="h-4 w-px bg-slate-700 mx-0.5" />
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleRotationChange('signature', -15); }}
                  className="min-w-9 min-h-9 sm:min-w-7 sm:min-h-7 w-9 h-9 sm:w-7 sm:h-7 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg flex items-center justify-center cursor-pointer text-slate-200 touch-manipulation"
                  title="Pivoter −15°"
                  aria-label="Pivoter la signature à gauche"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleRotationReset('signature'); }}
                  className="min-w-10 min-h-9 sm:min-w-8 sm:min-h-7 px-1.5 h-9 sm:h-7 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg flex items-center justify-center cursor-pointer text-blue-300 font-mono text-[11px] touch-manipulation"
                  title="Réinitialiser la rotation"
                  aria-label="Réinitialiser la rotation de la signature"
                >
                  {options.signaturePosition.rotation || 0}°
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleRotationChange('signature', 15); }}
                  className="min-w-9 min-h-9 sm:min-w-7 sm:min-h-7 w-9 h-9 sm:w-7 sm:h-7 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg flex items-center justify-center cursor-pointer text-slate-200 touch-manipulation"
                  title="Pivoter +15°"
                  aria-label="Pivoter la signature à droite"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div>
            {/* Header: Company Profile & Document Metadata */}
            <div
              data-pdf-module="header"
              data-pdf-module-label="En-tête & infos document"
              data-pdf-keep
              className="flex flex-row justify-between items-start gap-3 pb-2.5 border-b border-slate-200/80"
            >
              {/* Emitter Profile */}
              <div className="max-w-[280px] space-y-0.5">
                {profile.logoUrl && !imgError && (
                  <div className="group relative inline-block mb-1 max-w-full">
                    <img
                      src={profile.logoUrl}
                      alt="Logo"
                      onError={() => setImgError(true)}
                      className="object-contain block max-w-full h-auto"
                      style={{
                        width: `${options.logoWidth || 120}px`,
                        maxWidth: `${options.logoWidth || 120}px`,
                        maxHeight: `${Math.round((options.logoWidth || 120) * 0.7)}px`,
                        height: 'auto',
                        display: 'block',
                        objectFit: 'contain',
                      }}
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                    />
                    <div className="no-print opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity absolute -top-8 left-0 bg-slate-900/95 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 whitespace-nowrap z-40">
                      <ImageIcon className="w-3 h-3 text-sky-300" />
                      <span>Logo</span>
                      <div className="h-3 w-px bg-slate-700 mx-0.5"></div>
                      <button
                        type="button"
                        onClick={() => handleWidthChange('logo', -20)}
                        className="w-7 h-7 sm:w-5 sm:h-5 bg-slate-800 hover:bg-slate-700 rounded-md flex items-center justify-center font-black text-sm cursor-pointer text-slate-200"
                        title="Réduire logo"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => handleWidthChange('logo', 20)}
                        className="w-7 h-7 sm:w-5 sm:h-5 bg-slate-800 hover:bg-slate-700 rounded-md flex items-center justify-center font-black text-sm cursor-pointer text-slate-200"
                        title="Agrandir logo"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {profile.tagline && <p className="text-[10px] text-slate-500 italic font-medium leading-tight">{profile.tagline}</p>}

                <div className="text-[10px] text-slate-800 space-y-0.5 pt-0.5 leading-snug">
                  {profile.address && (
                    <p className="flex items-start gap-1 leading-snug">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                      <b className="font-bold" style={{ fontWeight: 700 }}>
                        {profile.address}{profile.city ? `, ${profile.city}` : ''}{profile.country ? `, ${profile.country}` : ''}
                      </b>
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0">
                    {profile.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                        <b className="font-bold text-slate-900" style={{ fontWeight: 700 }}>{profile.phone}</b>
                      </span>
                    )}
                    {profile.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                        <b className="font-bold text-slate-900" style={{ fontWeight: 700 }}>{profile.email}</b>
                      </span>
                    )}
                  </div>
                </div>

              </div>

              {/* Document Header Metadata Box */}
              <div className="w-auto max-w-[200px] text-right self-start bg-gradient-to-br from-slate-50 via-slate-50/90 to-slate-100/60 px-2.5 py-2 rounded-lg border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-end mb-0.5">
                  <span className={`text-base font-black uppercase tracking-wide leading-none ${isDevis ? 'text-sky-700' : 'text-blue-800'}`}>
                    {isDevis ? 'DEVIS' : 'FACTURE'}
                  </span>
                </div>
                <div className="text-xs font-mono font-black text-slate-900 tracking-tight mb-1 bg-white px-1.5 py-0.5 rounded-md border border-slate-200/80 inline-block">
                  N° {doc.number}
                </div>
                {isDevis ? (
                  doc.convertedFactureNumber && (
                    <div className="mb-1 text-[9px] font-bold text-blue-800 bg-blue-50 border border-blue-200/90 px-1.5 py-0.5 rounded inline-block font-mono leading-tight">
                      Facture rattachée n° {doc.convertedFactureNumber}
                    </div>
                  )
                ) : (
                  (() => {
                    const refDevis = doc.sourceDevisNumber || (doc.notes?.match(/devis\s*(?:n[°o]?\s*)?([A-Za-z0-9_-]+)/i)?.[1]);
                    if (!refDevis) return null;
                    return (
                      <div className="mb-1 text-[9px] font-bold text-purple-800 bg-purple-50 border border-purple-200/90 px-1.5 py-0.5 rounded inline-block font-mono leading-tight">
                        Issu du devis n° {refDevis}
                      </div>
                    );
                  })()
                )}

                <div className="space-y-0.5 text-[10px] text-slate-600 border-t border-slate-200/80 pt-1.5">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500 font-medium flex items-center gap-0.5">
                      <Calendar className="w-2.5 h-2.5 text-slate-400" />
                      <span>Émission :</span>
                    </span>
                    <span className="font-bold text-slate-900 font-mono">{formatDateFR(doc.date)}</span>
                  </div>
                  {!isDevis && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-slate-500 font-medium flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5 text-slate-400" />
                        <span>Échéance :</span>
                      </span>
                      <span className="font-bold text-slate-900 font-mono">{formatDateFR(doc.dueDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Client Destination Box */}
            <div
              data-pdf-module="client"
              data-pdf-module-label="Bloc client"
              data-pdf-keep
              className={`my-2.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-slate-50 via-slate-50/80 to-white border border-slate-200/90 shadow-2xs flex flex-row justify-between gap-3 items-center ${
              isDevis ? 'border-l-[3px] border-l-sky-600' : 'border-l-[3px] border-l-blue-700'
            }`}>
              <div className="space-y-0 flex-1 leading-snug">
                <div className="flex items-center gap-1 text-[9px] uppercase font-black text-slate-400 tracking-wider leading-none mb-0.5">
                  <User className={`w-3 h-3 ${isDevis ? 'text-sky-600' : 'text-blue-700'}`} />
                  <span>DESTINATAIRE / FACTURÉ À :</span>
                </div>
                <h3 className="text-xs font-black text-slate-900 leading-tight">
                  {doc.clientInfo.companyName || doc.clientInfo.name}
                </h3>
                {doc.clientInfo.companyName && options.showContactName && doc.clientInfo.name && (
                  <p className="text-[10px] text-slate-600 font-semibold leading-tight">À l'attention de : {doc.clientInfo.name}</p>
                )}
                {options.showClientAddress && doc.clientInfo.address && (
                  <p className="text-[10px] text-slate-600 leading-tight">{doc.clientInfo.address}</p>
                )}
                {options.showClientPhoneEmail && (doc.clientInfo.phone || doc.clientInfo.email) && (
                  <p className="text-[10px] text-slate-600 font-mono leading-tight">
                    {doc.clientInfo.phone}{doc.clientInfo.email ? ` | ${doc.clientInfo.email}` : ''}
                  </p>
                )}
              </div>

              {options.showClientNif && doc.clientInfo.nifRccm && (
                <div className="text-right bg-white px-2 py-1 rounded-md border border-slate-200/80 shadow-2xs shrink-0">
                  <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider block leading-none mb-0.5">Identifiant Fiscal Client</span>
                  <p className="font-mono font-bold text-[10px] text-slate-800 leading-tight">{doc.clientInfo.nifRccm}</p>
                </div>
              )}
            </div>

            {/* Line Items Table — les <tr> restent entiers (coupure entre lignes uniquement) */}
            <div
              data-pdf-module="items"
              data-pdf-module-label="Tableau des articles"
              className="mb-2.5"
            >
              <table className="w-full text-left border-collapse border-2 border-black">
                <thead>
                  <tr className="bg-white text-black text-[11px] uppercase tracking-wide">
                    <th className="py-1 px-1.5 text-center w-10 border border-black font-bold">
                      <b>N°</b>
                    </th>
                    <th className="py-1 px-2 border border-black font-bold">
                      <b>Désignation / Article</b>
                    </th>
                    {hasDimensions && (
                      <>
                        <th className="py-1 px-1.5 text-center w-24 border border-black font-bold">
                          <b>Largeur (mm)</b>
                        </th>
                        <th className="py-1 px-1.5 text-center w-24 border border-black font-bold">
                          <b>Hauteur (mm)</b>
                        </th>
                      </>
                    )}
                    <th className="py-1 px-1.5 text-center w-14 border border-black font-bold">
                      <b>Qté</b>
                    </th>
                    <th className="py-1 px-2 text-right w-32 border border-black font-bold">
                      <b>P.U. ({doc.currency})</b>
                    </th>
                    {hasDiscount && (
                      <th className="py-1 px-1.5 text-center w-16 border border-black font-bold">
                        <b>Remise</b>
                      </th>
                    )}
                    <th className="py-1 px-2 text-right w-36 border border-black font-bold">
                      <b>Total HT ({doc.currency})</b>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const pdfColSpan =
                      2 + // N° + désignation
                      (hasDimensions ? 2 : 0) +
                      2 + // Qté + P.U.
                      (hasDiscount ? 1 : 0) +
                      1; // Total
                    let lineNo = 0;
                    return doc.items.map((item, idx) => {
                      if (isSectionItem(item)) {
                        return (
                          <tr key={item.id || `section-${idx}`} className="bg-white">
                            <td
                              colSpan={pdfColSpan}
                              className="py-1 px-2 text-[11px] font-black uppercase tracking-wide text-black border border-black"
                            >
                              {item.description?.trim() || '—'}
                            </td>
                          </tr>
                        );
                      }

                      lineNo += 1;
                      const gross = item.quantity * item.unitPrice;
                      const discountAmt = gross * ((item.discount || 0) / 100);
                      const netHT = gross - discountAmt;

                      return (
                        <tr key={item.id || idx} className="bg-white">
                          <td className="py-1 px-1.5 text-center text-black font-mono text-[11px] font-bold tabular-nums border border-black">
                            {lineNo}
                          </td>
                          <td className="py-1 px-2 border border-black">
                            <div className="font-semibold text-black text-xs leading-snug">{item.description}</div>
                          </td>
                          {hasDimensions && (
                            <>
                              <td className="py-1 px-1.5 text-center text-black font-mono text-xs font-medium border border-black">
                                {item.width ? String(item.width) : '-'}
                              </td>
                              <td className="py-1 px-1.5 text-center text-black font-mono text-xs font-medium border border-black">
                                {item.length ? String(item.length) : '-'}
                              </td>
                            </>
                          )}
                          <td className="py-1 px-1.5 text-center text-black font-bold text-xs border border-black">{item.quantity}</td>
                          <td className="py-1 px-2 text-right text-black font-mono text-xs font-semibold border border-black">{formatFCFA(item.unitPrice, '')}</td>
                          {hasDiscount && (
                            <td className="py-1 px-1.5 text-center text-black font-mono text-xs border border-black">{item.discount ? `${item.discount}%` : '-'}</td>
                          )}
                          <td className="py-1 px-2 text-right font-mono font-black text-black text-xs border border-black">{formatFCFA(netHT, '')}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Financial Totals & Optional Payment Section */}
            <div
              data-pdf-module="totals"
              data-pdf-module-label="Totaux & paiement"
              data-pdf-keep
              className={`flex flex-row gap-3 mb-2.5 ${options.showPaymentDetails ? 'justify-between items-stretch' : 'justify-end items-end'}`}
            >
              {/* Optional Payment Details & Bank RIB */}
              {options.showPaymentDetails && (
                <div className="flex-1 min-w-0 bg-slate-50/90 px-2.5 py-1.5 rounded-lg border border-slate-200/90 space-y-0.5 text-[10px] leading-snug">
                  <div className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-800 tracking-wider pb-0.5 border-b border-slate-200/80">
                    <CreditCard className="w-3 h-3 text-blue-600" />
                    <span>MODALITÉS DE RÈGLEMENT & RIB</span>
                  </div>
                  {profile.bankDetails.bankName && (
                    <p><span className="text-slate-500">Banque :</span> <span className="font-bold text-slate-800">{profile.bankDetails.bankName}</span></p>
                  )}
                  {profile.bankDetails.ibanRib && (
                    <p className="flex items-center gap-1 flex-wrap">
                      <span className="text-slate-500">RIB / IBAN :</span>
                      <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-px rounded border border-slate-200/90 inline-block">
                        {profile.bankDetails.ibanRib}
                      </span>
                    </p>
                  )}
                  {profile.bankDetails.accountName && (
                    <p><span className="text-slate-500">Titulaire :</span> <span className="font-bold text-slate-800">{profile.bankDetails.accountName}</span></p>
                  )}
                  {profile.bankDetails.mobileMoney && (
                    <div className="pt-0.5 mt-0.5 border-t border-slate-200/80 text-blue-800 font-bold flex items-center gap-1">
                      <span className="text-slate-500 font-normal">Mobile Money :</span>
                      <span className="font-mono bg-blue-50 px-1.5 py-px rounded border border-blue-200 text-blue-800">{profile.bankDetails.mobileMoney}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Totals Summary */}
              <div className="w-56 bg-slate-50/90 px-2.5 py-1.5 rounded-lg border border-slate-200/90 space-y-0.5 text-[10px] leading-snug shrink-0">
                <div className="flex justify-between text-slate-600">
                  <span className="font-medium">Total HT :</span>
                  <span className="font-mono font-bold text-slate-800">{formatFCFA(totals.totalHT, doc.currency)}</span>
                </div>

                {totals.totalDiscount > 0 && (
                  <div className="flex justify-between text-rose-600 font-medium">
                    <span>Remise accordée :</span>
                    <span className="font-mono font-bold">-{formatFCFA(totals.totalDiscount, doc.currency)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span className="font-medium">TVA ({doc.taxRate}%) :</span>
                  <span className="font-mono font-bold text-slate-800">{formatFCFA(totals.totalTVA, doc.currency)}</span>
                </div>

                <div className="flex justify-between items-center text-xs font-black text-slate-900 pt-1 border-t border-slate-900">
                  <span>TOTAL TTC :</span>
                  <span className={`font-mono text-sm px-1.5 py-0.5 rounded-md border shadow-2xs ${
                    isDevis ? 'text-sky-700 bg-sky-50 border-sky-200' : 'text-blue-800 bg-blue-50 border-blue-200'
                  }`}>
                    {formatFCFA(totals.totalTTC, doc.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Amount in Words Certification Banner */}
            {options.showAmountInWords && (
              <div
                data-pdf-module="amountWords"
                data-pdf-module-label="Montant en lettres"
                data-pdf-keep
                className="px-2.5 py-1.5 bg-gradient-to-r from-slate-100/90 to-slate-50 rounded-lg border-l-[3px] border-l-blue-600 border-y border-r border-slate-200/80 mb-2.5 text-[10px] flex items-center gap-2 shadow-2xs leading-snug"
              >
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-700">Arrêté {isDevis ? 'le présent devis' : 'la présente facture'} à la somme de : </span>
                  <span className="font-bold text-slate-900 italic">« {amountInWords} »</span>
                </div>
              </div>
            )}

            {/* Notes & Terms */}
            {(doc.notes || doc.termsAndConditions) && (
              <div
                data-pdf-module="notes"
                data-pdf-module-label="Notes & conditions"
                data-pdf-keep
                className="grid grid-cols-2 gap-2.5 text-[10px] text-slate-600 border-t border-slate-200/80 pt-2 mb-2.5"
              >
                {doc.notes && (
                  <div className="bg-slate-50/80 px-2.5 py-1.5 rounded-lg border border-slate-200/70 space-y-0.5">
                    <h5 className="font-bold text-slate-800 text-[9px] uppercase tracking-wider flex items-center gap-1">
                      <Info className="w-2.5 h-2.5 text-slate-500" />
                      <span>Notes :</span>
                    </h5>
                    <p className="whitespace-pre-line text-slate-700 leading-snug">{doc.notes}</p>
                  </div>
                )}
                {doc.termsAndConditions && (
                  <div className="bg-slate-50/80 px-2.5 py-1.5 rounded-lg border border-slate-200/70 space-y-0.5">
                    <h5 className="font-bold text-slate-800 text-[9px] uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-slate-500" />
                      <span>Conditions de règlement :</span>
                    </h5>
                    <p className="whitespace-pre-line text-slate-700 leading-snug">{doc.termsAndConditions}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Signatures — une seule fois en fin de contenu */}
          {options.showSignatures && (
            <div
              data-pdf-module="signatures"
              data-pdf-module-label="Cadre signatures"
              data-pdf-keep
              className="pt-3 border-t border-slate-200 mt-3"
            >
              <div className="flex justify-between items-end text-[11px] text-slate-600 px-4">
                <div className="text-center w-48">
                  <p className="font-bold text-slate-800 mb-10">Le Client (Bon pour accord)</p>
                  <div className="border-b border-dashed border-slate-300 w-full mb-1"></div>
                  <p className="text-[9px] text-slate-400">Date, nom et signature</p>
                </div>

                <div className="text-center w-56">
                  <p className="font-bold text-slate-800 mb-10">Pour l'Émetteur / Cachet</p>
                  <div className="border-b border-dashed border-slate-300 w-full mb-1"></div>
                  <p className="text-[9px] text-slate-400">Cachet et signature</p>
                </div>
              </div>
            </div>
          )}

          {/*
            Pied légal : masqué dans l’aperçu (hors écran), révélé uniquement
            pendant la capture « Préparer PDF » / export (voir pdfGenerator).
          */}
          <div
            data-pdf-page-footer
            className="pt-4 border-t border-slate-200 bg-white"
            style={{
              position: 'absolute',
              left: '-10000px',
              top: 0,
              width: '714px',
              visibility: 'hidden',
              pointerEvents: 'none',
            }}
            aria-hidden
          >
            <div className="relative text-center text-[10px] text-slate-500 space-y-1 px-36">
              {legalFooterBlock}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};


