import React, { useEffect, useMemo, useState } from 'react';
import {
  Scissors,
  Download,
  X,
  Loader2,
  RotateCcw,
  ArrowDownToLine,
  ArrowUpToLine,
  ZoomIn,
  Trash2,
} from 'lucide-react';
import {
  PdfLayoutMeasure,
  PdfModuleMeasure,
  PdfVisualPagePreview,
  buildPdfVisualPages,
  findBreakAfterNearPageStart,
  getModuleHighlightRect,
  planPdfPages,
} from '../../utils/pdfGenerator';

interface PdfPageBreakModalProps {
  open: boolean;
  layout: PdfLayoutMeasure | null;
  breakAfterModuleIds: string[];
  pullToPreviousModuleIds: string[];
  hiddenPageStarts: number[];
  onChangeBreaks: (ids: string[]) => void;
  onChangePulls: (ids: string[]) => void;
  onChangeHiddenPages: (starts: number[]) => void;
  onConfirmDownload: () => void;
  onClose: () => void;
  isExporting: boolean;
  isCapturingPreview: boolean;
  documentLabel: string;
}

function PagePreviewFrame({
  page,
  hoveredModule,
  selected,
  onSelect,
  onDeleteEmpty,
  size = 'large',
}: {
  page: PdfVisualPagePreview;
  hoveredModule: PdfModuleMeasure | null;
  selected?: boolean;
  onSelect?: () => void;
  onDeleteEmpty?: () => void;
  size?: 'large' | 'thumb';
}) {
  const highlight =
    hoveredModule && !page.isEmpty
      ? getModuleHighlightRect(hoveredModule, page)
      : null;

  const frame = (
    <div
      className={`relative bg-white overflow-hidden ${
        size === 'large'
          ? 'shadow-2xl border border-slate-300 rounded-sm w-full max-w-[520px]'
          : 'rounded-xl border-2 shadow-sm'
      } ${
        page.isEmpty
          ? 'border-rose-300 ring-1 ring-rose-200'
          : size === 'thumb'
            ? selected
              ? 'border-blue-600 ring-2 ring-blue-200'
              : 'border-slate-200 hover:border-slate-400'
            : ''
      }`}
    >
      <div
        className={`text-white font-bold flex justify-between items-center gap-2 ${
          page.isEmpty ? 'bg-rose-700' : 'bg-slate-900'
        } ${size === 'large' ? 'px-3 py-1.5 text-[11px]' : 'px-2 py-1 text-[10px]'}`}
      >
        <span>
          Page {page.pageIndex + 1}
          {page.isEmpty ? ' · vide' : ''}
        </span>
        <span className="text-white/70">
          {page.isEmpty ? 'Aucun contenu' : `${Math.round(page.fillRatio * 100)}%`}
          {!page.isEmpty && page.fillRatio > 1.02 ? ' · condensée' : ''}
        </span>
      </div>
      <div className="relative">
        <img
          src={page.dataUrl}
          alt={`Aperçu page ${page.pageIndex + 1}`}
          className={`w-full h-auto block bg-white ${page.isEmpty ? 'opacity-40' : ''}`}
        />
        {page.isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-rose-50/50 p-3">
            <p className="text-[11px] font-bold text-rose-700 text-center">Page vide</p>
            {onDeleteEmpty && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteEmpty();
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow"
              >
                <Trash2 className="w-3 h-3" />
                Supprimer cette page
              </button>
            )}
          </div>
        )}
        {highlight && (
          <div
            className="pointer-events-none absolute left-1 right-1 rounded-md border-2 border-blue-500 bg-blue-400/20 shadow-[0_0_0_1px_rgba(59,130,246,0.35)] transition-all duration-150"
            style={{
              top: `${highlight.top}%`,
              height: `${highlight.height}%`,
            }}
          >
            <div className="absolute -top-5 left-0 max-w-full truncate rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
              {hoveredModule?.label}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (onSelect && !page.isEmpty) {
    return (
      <button type="button" onClick={onSelect} className="text-left w-full cursor-pointer">
        {frame}
      </button>
    );
  }
  return frame;
}

export const PdfPageBreakModal: React.FC<PdfPageBreakModalProps> = ({
  open,
  layout,
  breakAfterModuleIds,
  pullToPreviousModuleIds,
  hiddenPageStarts,
  onChangeBreaks,
  onChangePulls,
  onChangeHiddenPages,
  onConfirmDownload,
  onClose,
  isExporting,
  isCapturingPreview,
  documentLabel,
}) => {
  const [visualPages, setVisualPages] = useState<PdfVisualPagePreview[]>([]);
  const [selectedPage, setSelectedPage] = useState(0);
  const [hoveredModuleId, setHoveredModuleId] = useState<string | null>(null);

  const pages = useMemo(
    () =>
      layout
        ? planPdfPages(layout, breakAfterModuleIds, pullToPreviousModuleIds)
        : [],
    [layout, breakAfterModuleIds, pullToPreviousModuleIds]
  );

  useEffect(() => {
    if (!open || isCapturingPreview || !layout) {
      if (!open) {
        setVisualPages([]);
        setHoveredModuleId(null);
      }
      return;
    }
    const next = buildPdfVisualPages(
      breakAfterModuleIds,
      pullToPreviousModuleIds,
      hiddenPageStarts
    );
    setVisualPages(next);
    setSelectedPage((prev) => Math.min(prev, Math.max(0, next.length - 1)));
  }, [
    open,
    layout,
    breakAfterModuleIds,
    pullToPreviousModuleIds,
    hiddenPageStarts,
    isCapturingPreview,
  ]);

  if (!open) return null;

  const breakSet = new Set(breakAfterModuleIds);
  const pullSet = new Set(pullToPreviousModuleIds);
  const modules = layout?.modules || [];
  const activeVisual = visualPages[selectedPage] || visualPages[0];
  const hoveredModule = hoveredModuleId
    ? modules.find((m) => m.id === hoveredModuleId) || null
    : null;

  const handleModuleHover = (moduleId: string | null) => {
    setHoveredModuleId(moduleId);
    if (!moduleId || !layout) return;
    const mod = layout.modules.find((m) => m.id === moduleId);
    if (!mod || !visualPages.length) return;

    // Afficher la page où se trouve le module
    const pageWithMod = visualPages.find((p) => {
      const rect = getModuleHighlightRect(mod, p);
      return rect != null;
    });
    if (pageWithMod) setSelectedPage(pageWithMod.pageIndex);
  };

  const toggleBreakAfter = (moduleId: string) => {
    if (breakSet.has(moduleId)) {
      onChangeBreaks(breakAfterModuleIds.filter((id) => id !== moduleId));
    } else {
      const idx = modules.findIndex((m) => m.id === moduleId);
      const nextId = idx >= 0 ? modules[idx + 1]?.id : undefined;
      if (nextId && pullSet.has(nextId)) {
        onChangePulls(pullToPreviousModuleIds.filter((id) => id !== nextId));
      }
      // Nouvelle coupure : réafficher les pages précédemment masquées
      if (hiddenPageStarts.length) onChangeHiddenPages([]);
      onChangeBreaks([...breakAfterModuleIds, moduleId]);
    }
  };

  const pullToPrevious = (moduleId: string) => {
    const idx = modules.findIndex((m) => m.id === moduleId);
    if (idx <= 0) return;
    const prevId = modules[idx - 1].id;

    if (breakSet.has(prevId)) {
      onChangeBreaks(breakAfterModuleIds.filter((id) => id !== prevId));
    }

    if (pullSet.has(moduleId)) {
      onChangePulls(pullToPreviousModuleIds.filter((id) => id !== moduleId));
    } else {
      onChangePulls([...pullToPreviousModuleIds, moduleId]);
    }
  };

  const resetAll = () => {
    onChangeBreaks([]);
    onChangePulls([]);
    onChangeHiddenPages([]);
  };

  const deleteEmptyPage = (pageIndex: number) => {
    const page = visualPages.find((p) => p.pageIndex === pageIndex);
    if (!page || pageIndex <= 0) return;

    // 1) Masquer immédiatement cette tranche dans l'aperçu
    const startKey = Math.round(page.startY);
    if (!hiddenPageStarts.includes(startKey)) {
      onChangeHiddenPages([...hiddenPageStarts, startKey]);
    }

    // 2) Retirer aussi la coupure forcée qui l'a créée (si trouvée)
    if (layout) {
      const breakId = findBreakAfterNearPageStart(
        layout,
        breakAfterModuleIds,
        page.startY,
        page.scaleY
      );
      if (breakId) {
        onChangeBreaks(breakAfterModuleIds.filter((id) => id !== breakId));
      }
    }

    setSelectedPage(0);
  };

  const pageCount = visualPages.filter((p) => !p.isEmpty).length || pages.length || 1;
  const emptyCount = visualPages.filter((p) => p.isEmpty).length;

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-3">
      <div className="bg-slate-100 w-full h-[96vh] sm:h-auto sm:max-h-[96vh] sm:max-w-6xl sm:rounded-3xl rounded-t-3xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden">
        <div className="shrink-0 flex items-start justify-between gap-3 p-4 sm:px-5 sm:py-4 border-b border-slate-800 bg-slate-900 text-white">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-blue-300 text-xs font-black uppercase tracking-wider mb-1">
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Aperçu PDF réel</span>
            </div>
            <h2 className="text-lg font-black tracking-tight truncate">{documentLabel}</h2>
            <p className="text-xs text-slate-300 mt-1">
              Survolez un module à droite pour le voir encadré dans l’aperçu.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 bg-slate-200/80">
            {isCapturingPreview ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-600 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-sm font-semibold">Génération de l’aperçu des pages…</p>
              </div>
            ) : visualPages.length === 0 ? (
              <div className="text-center py-20 text-sm text-slate-500">
                Impossible de générer l’aperçu visuel. Vous pouvez quand même télécharger.
              </div>
            ) : (
              <>
                <div className="mb-4 space-y-2">
                  <p className="text-xs font-bold text-slate-700">
                    {pageCount} page{pageCount > 1 ? 's' : ''} A4
                    {emptyCount > 0 && (
                      <span className="text-rose-600 font-bold">
                        {' '}
                        · {emptyCount} vide{emptyCount > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="text-slate-400 font-medium">
                      {' '}
                      — selon la longueur du document / nombre d’articles
                    </span>
                  </p>
                  <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-1 -mx-1 px-1">
                    {visualPages.map((p) => (
                      <button
                        key={p.pageIndex}
                        type="button"
                        onClick={() => setSelectedPage(p.pageIndex)}
                        className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer border ${
                          selectedPage === p.pageIndex
                            ? 'bg-slate-900 text-white border-slate-900'
                            : p.isEmpty
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {p.isEmpty ? `P.${p.pageIndex + 1}∅` : `Page ${p.pageIndex + 1}`}
                      </button>
                    ))}
                  </div>
                </div>

                {activeVisual && (
                  <div className="mb-5 flex justify-center">
                    <PagePreviewFrame
                      page={activeVisual}
                      hoveredModule={hoveredModule}
                      onDeleteEmpty={
                        activeVisual.isEmpty
                          ? () => deleteEmptyPage(activeVisual.pageIndex)
                          : undefined
                      }
                      size="large"
                    />
                  </div>
                )}

                <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-2 -mx-1 px-1">
                  {visualPages.map((p) => (
                    <div key={`thumb-${p.pageIndex}`} className="w-[140px] sm:w-[160px] shrink-0">
                      <PagePreviewFrame
                        page={p}
                        hoveredModule={hoveredModule}
                        selected={selectedPage === p.pageIndex}
                        onSelect={() => setSelectedPage(p.pageIndex)}
                        onDeleteEmpty={
                          p.isEmpty ? () => deleteEmptyPage(p.pageIndex) : undefined
                        }
                        size="thumb"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <aside className="min-h-0 max-h-[42vh] lg:max-h-none border-t lg:border-t-0 lg:border-l border-slate-300 bg-white flex flex-col">
            <div className="shrink-0 p-4 pb-2 border-b border-slate-100 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-blue-600" />
                  Découpage
                </h3>
                <button
                  type="button"
                  onClick={resetAll}
                  disabled={isCapturingPreview}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Auto
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Faites défiler la liste pour tous les modules. Coupure = nouvelle page ;
                page vide = bouton rouge sur l’aperçu.
              </p>
            </div>

            <div
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 pt-3 pb-10"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
            {!layout || modules.length === 0 ? (
              <p className="text-xs text-slate-400">Aucun module détecté.</p>
            ) : (
              <div className="space-y-2">
                {modules.map((mod, idx) => {
                  const isLast = idx === modules.length - 1;
                  const activeBreak = breakSet.has(mod.id);
                  const pulled = pullSet.has(mod.id);
                  const pageOf =
                    visualPages.find((p) => p.moduleIds.includes(mod.id)) ||
                    pages.find((p) => p.moduleIds.includes(mod.id));
                  const pageIndex = pageOf?.pageIndex ?? 0;
                  const isHovered = hoveredModuleId === mod.id;

                  return (
                    <div key={mod.id}>
                      <div
                        onMouseEnter={() => handleModuleHover(mod.id)}
                        onMouseLeave={() => handleModuleHover(null)}
                        className={`rounded-xl border px-3 py-2.5 space-y-2 transition-colors ${
                          isHovered
                            ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={`w-6 h-6 rounded-md text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 border ${
                              isHovered
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-600 border-slate-200'
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 leading-snug">
                              {mod.label}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Page {pageIndex + 1}
                              {pulled && (
                                <span className="text-blue-600 font-bold"> · remonté</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {pageIndex > 0 && (
                          <button
                            type="button"
                            onClick={() => pullToPrevious(mod.id)}
                            className={`w-full px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer border ${
                              pulled
                                ? 'bg-blue-600 text-white border-blue-700'
                                : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                            }`}
                          >
                            <ArrowUpToLine className="w-3 h-3" />
                            {pulled ? 'Annuler remonter' : `Mettre sur la page ${pageIndex}`}
                          </button>
                        )}
                      </div>

                      {!isLast && (
                        <div className="flex justify-center py-1.5">
                          <button
                            type="button"
                            onClick={() => toggleBreakAfter(mod.id)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 border cursor-pointer ${
                              activeBreak
                                ? 'bg-amber-500 text-slate-950 border-amber-600'
                                : 'bg-white text-slate-600 border-slate-200 border-dashed hover:border-amber-400'
                            }`}
                          >
                            <Scissors className="w-3 h-3" />
                            {activeBreak ? 'Coupure ici' : 'Nouvelle page après'}
                            <ArrowDownToLine className="w-3 h-3 opacity-70" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </aside>
        </div>

        <div className="shrink-0 p-4 border-t border-slate-300 bg-white flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirmDownload}
            disabled={isExporting || isCapturingPreview}
            className="px-5 py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Génération du PDF…
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Télécharger ({pageCount} page{pageCount > 1 ? 's' : ''})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
