import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

/** Largeur A4 à 96dpi — le PDF et le preview partagent ces proportions. */
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123; // 794 * 297/210
const A4_PADDING_PX = 40;

export interface PdfModuleMeasure {
  id: string;
  label: string;
  top: number;
  bottom: number;
  height: number;
}

export interface PdfPagePlan {
  pageIndex: number;
  moduleIds: string[];
  modules: PdfModuleMeasure[];
  /** Remplissage approximatif 0–1+ ( >1 = page condensée ) */
  fillRatio: number;
}

/** Miniature visuelle d'une page A4 telle que générée dans le PDF */
export interface PdfVisualPagePreview {
  pageIndex: number;
  dataUrl: string;
  fillRatio: number;
  modules: PdfModuleMeasure[];
  moduleIds: string[];
  /** Coordonnées canvas pour positionner le surlignage au survol */
  startY: number;
  endY: number;
  sliceH: number;
  pageHeightPx: number;
  overflowsPage: boolean;
  /** DOM px → canvas px */
  scaleY: number;
  /** Page sans contenu utile */
  isEmpty: boolean;
}

export interface PdfLayoutMeasure {
  modules: PdfModuleMeasure[];
  contentHeight: number;
  pageHeight: number;
  /** Blocs insécables (modules + lignes tableau) en px DOM — même logique que le PDF */
  keepBlocks: { top: number; bottom: number }[];
}

export interface DownloadPdfOptions {
  /** Forcer une nouvelle page après ces modules (`data-pdf-module`) */
  breakAfterModuleIds?: string[];
  /** Inclure ces modules sur la page précédente (coupe après eux, même au-delà de la hauteur idéale) */
  pullToPreviousModuleIds?: string[];
  /** Pages vides masquées (startY canvas arrondi) */
  hiddenPageStarts?: number[];
}

type PullTarget = { top: number; bottom: number };

/** Prolonge la coupe pour inclure les modules « remontés » sur la page courante. */
function extendCutForPulledModules(
  cutY: number,
  pageStartY: number,
  idealCut: number,
  pageHeightPx: number,
  contentHeight: number,
  pullTargets: PullTarget[]
): number {
  if (!pullTargets.length) return cutY;
  let result = cutY;
  const maxEnd = Math.min(contentHeight, pageStartY + Math.ceil(pageHeightPx * 1.5));

  for (const t of pullTargets) {
    // Le module commence dans la fenêtre de la page courante
    if (t.top < pageStartY - 2) continue;
    if (t.top >= idealCut + 12) continue;
    const candidate = Math.min(Math.ceil(t.bottom) + 4, maxEnd);
    if (candidate > result) result = candidate;
  }
  return result;
}

function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 2500);
}

/** Redimensionne les assets (logo/cachet ~1536px) avant capture pour éviter OOM / canvas tainted. */
async function blobToResizedDataUrl(blob: Blob, maxEdge = 520): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height, 1));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas image indisponible');
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas.toDataURL('image/png');
  } finally {
    bitmap.close();
  }
}

async function fetchAsResizedDataUrl(url: string, maxEdge = 520): Promise<string> {
  if (url.startsWith('data:')) return url;
  const response = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'reload' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  try {
    return await blobToResizedDataUrl(blob, maxEdge);
  } catch {
    // Fallback sans resize si createImageBitmap échoue
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Lecture image impossible'));
      reader.readAsDataURL(blob);
    });
  }
}

/** Embarque logo/cachet/signature en data URL (redimensionnés) pour éviter un canvas « tainted ». */
async function embedImagesAsDataUrls(root: HTMLElement): Promise<() => void> {
  const images = Array.from(root.querySelectorAll('img'));
  const backups: { img: HTMLImageElement; src: string; crossOrigin: string | null }[] = [];

  await Promise.all(
    images.map(async (img) => {
      const src = img.currentSrc || img.src;
      if (!src || src.startsWith('data:')) return;
      backups.push({
        img,
        src: img.getAttribute('src') || src,
        crossOrigin: img.getAttribute('crossorigin'),
      });
      try {
        const displayW = Math.max(img.clientWidth || 0, img.getBoundingClientRect().width || 0);
        const maxEdge = displayW > 0 ? Math.min(720, Math.ceil(displayW * 2.5)) : 520;
        const dataUrl = await fetchAsResizedDataUrl(src, maxEdge);
        img.removeAttribute('crossorigin');
        img.src = dataUrl;
        // Verrouille la taille affichée (évite explosion taille native en capture)
        if (displayW > 0) {
          img.style.width = `${Math.round(displayW)}px`;
          img.style.maxWidth = `${Math.round(displayW)}px`;
          img.style.height = 'auto';
          img.style.objectFit = 'contain';
        }
        await new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
          window.setTimeout(() => resolve(), 2500);
        });
      } catch (err) {
        console.warn('Image PDF non embarquée:', src, err);
      }
    })
  );

  return () => {
    backups.forEach(({ img, src, crossOrigin }) => {
      if (crossOrigin) img.setAttribute('crossorigin', crossOrigin);
      else img.removeAttribute('crossorigin');
      img.src = src;
      img.style.width = '';
      img.style.maxWidth = '';
      img.style.height = '';
      img.style.objectFit = '';
    });
  };
}

/**
 * Copie les styles calculés en inline avant html2canvas.
 * Nécessaire en prod : Tailwind v4 (@layer + oklch) n'est pas toujours honoré dans le clone.
 */
const CAPTURE_STYLE_PROPS = [
  'display',
  'flex-direction',
  'flex-wrap',
  'justify-content',
  'align-items',
  'align-self',
  'align-content',
  'gap',
  'row-gap',
  'column-gap',
  'grid-template-columns',
  'grid-template-rows',
  'width',
  'max-width',
  'min-width',
  'height',
  'max-height',
  'min-height',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'background-color',
  'background-image',
  'color',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius',
  'border-collapse',
  'border-spacing',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-transform',
  'white-space',
  'vertical-align',
  'position',
  'top',
  'left',
  'right',
  'bottom',
  'z-index',
  'overflow',
  'overflow-x',
  'overflow-y',
  'box-sizing',
  'opacity',
  'object-fit',
  'object-position',
  'table-layout',
  'mix-blend-mode',
] as const;

function inlineComputedStylesForCapture(root: HTMLElement): () => void {
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
  const backups = nodes.map((el) => ({ el, cssText: el.style.cssText }));

  for (const el of nodes) {
    if (el.classList.contains('no-print') || el.closest('.no-print')) continue;
    const cs = window.getComputedStyle(el);
    for (const prop of CAPTURE_STYLE_PROPS) {
      const val = cs.getPropertyValue(prop);
      if (val && val !== 'initial') {
        el.style.setProperty(prop, val);
      }
    }
    if (el instanceof HTMLImageElement) {
      const w = el.clientWidth || el.getBoundingClientRect().width;
      const h = el.clientHeight || el.getBoundingClientRect().height;
      if (w > 0) {
        el.style.width = `${Math.round(w)}px`;
        el.style.maxWidth = `${Math.round(w)}px`;
        if (h > 0) el.style.height = `${Math.round(h)}px`;
        el.style.objectFit = 'contain';
      }
    }
  }

  return () => {
    backups.forEach(({ el, cssText }) => {
      el.style.cssText = cssText;
    });
  };
}

type StyleBackup = {
  width: string;
  maxWidth: string;
  minWidth: string;
  minHeight: string;
  height: string;
  padding: string;
  borderRadius: string;
  boxShadow: string;
  overflow: string;
  filter: string;
  boxSizing: string;
  margin: string;
};

function lockA4Layout(element: HTMLElement): () => void {
  const prev: StyleBackup = {
    width: element.style.width,
    maxWidth: element.style.maxWidth,
    minWidth: element.style.minWidth,
    minHeight: element.style.minHeight,
    height: element.style.height,
    padding: element.style.padding,
    borderRadius: element.style.borderRadius,
    boxShadow: element.style.boxShadow,
    overflow: element.style.overflow,
    filter: element.style.filter,
    boxSizing: element.style.boxSizing,
    margin: element.style.margin,
  };

  element.style.boxSizing = 'border-box';
  element.style.width = `${A4_WIDTH_PX}px`;
  element.style.maxWidth = `${A4_WIDTH_PX}px`;
  element.style.minWidth = `${A4_WIDTH_PX}px`;
  element.style.minHeight = `${A4_HEIGHT_PX}px`;
  element.style.height = 'auto';
  element.style.padding = `${A4_PADDING_PX}px`;
  element.style.borderRadius = '0';
  element.style.boxShadow = 'none';
  element.style.overflow = 'visible';
  element.style.filter = 'none';
  element.style.margin = '0 auto';

  return () => {
    element.style.width = prev.width;
    element.style.maxWidth = prev.maxWidth;
    element.style.minWidth = prev.minWidth;
    element.style.minHeight = prev.minHeight;
    element.style.height = prev.height;
    element.style.padding = prev.padding;
    element.style.borderRadius = prev.borderRadius;
    element.style.boxShadow = prev.boxShadow;
    element.style.overflow = prev.overflow;
    element.style.filter = prev.filter;
    element.style.boxSizing = prev.boxSizing;
    element.style.margin = prev.margin;
  };
}

/**
 * Prépare le clone html2canvas :
 * - masque les contrôles .no-print
 * - proportions A4 (pas de bande blanche à droite)
 * - retire filter/drop-shadow
 * - force les images à leur largeur inline (déjà posée avant capture)
 */
function prepareCloneForExport(clonedDoc: Document, elementId: string): void {
  clonedDoc.querySelectorAll('.no-print').forEach((el) => {
    if (el instanceof HTMLElement) el.style.display = 'none';
  });

  const root = clonedDoc.getElementById(elementId) || clonedDoc.body;
  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    el.style.filter = 'none';
    el.style.webkitFilter = 'none';
    el.style.boxShadow = 'none';

    if (el instanceof HTMLImageElement) {
      const src = el.currentSrc || el.src;
      if (src) {
        el.removeAttribute('crossorigin');
        el.src = src;
      }
      // Empêche le rendu à la taille naturelle (1536px) si le CSS du clone est incomplet
      const lockedW = parseFloat(el.style.width) || 0;
      if (lockedW > 0) {
        el.style.width = `${lockedW}px`;
        el.style.maxWidth = `${lockedW}px`;
        el.style.height = 'auto';
        el.style.objectFit = 'contain';
      }
    }
  });

  if (root instanceof HTMLElement) {
    root.style.boxSizing = 'border-box';
    root.style.width = `${A4_WIDTH_PX}px`;
    root.style.maxWidth = `${A4_WIDTH_PX}px`;
    root.style.minWidth = `${A4_WIDTH_PX}px`;
    root.style.minHeight = `${A4_HEIGHT_PX}px`;
    root.style.padding = `${A4_PADDING_PX}px`;
    root.style.boxShadow = 'none';
    root.style.borderRadius = '0';
    root.style.transform = 'none';
    root.style.overflow = 'visible';
    root.style.backgroundColor = '#ffffff';
    root.style.margin = '0';
    root.style.display = root.style.display || 'flex';
    root.style.flexDirection = root.style.flexDirection || 'column';
  }
}

function canvasToPngDataUrl(canvas: HTMLCanvasElement): string {
  try {
    return canvas.toDataURL('image/png');
  } catch (err) {
    const name = err instanceof DOMException ? err.name : '';
    const msg = err instanceof Error ? err.message : String(err);
    if (name === 'SecurityError' || /insecure|tainted/i.test(msg)) {
      throw new Error(
        'Export bloqué par le navigateur (images). Réessayez après rechargement.'
      );
    }
    throw err instanceof Error ? err : new Error(msg);
  }
}

function isNearWhitePixel(data: Uint8ClampedArray, i: number): boolean {
  return data[i] >= 248 && data[i + 1] >= 248 && data[i + 2] >= 248;
}

/** Retire les colonnes blanches à gauche/droite pour coller le contenu à la largeur utile. */
function trimHorizontalWhitespace(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);

  let minX = width;
  let maxX = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (!isNearWhitePixel(data, i)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }

  if (maxX < 0) return canvas;

  // Garde une petite marge interne, mais coupe le vide excessif à droite/gauche
  const pad = 4;
  minX = Math.max(0, minX - pad);
  maxX = Math.min(width - 1, maxX + pad);

  const trimmedW = maxX - minX + 1;
  // Ne trim que s'il y a vraiment du vide (> ~2% de chaque côté cumulé)
  if (trimmedW >= width * 0.98) return canvas;

  const out = document.createElement('canvas');
  out.width = trimmedW;
  out.height = height;
  const outCtx = out.getContext('2d');
  if (!outCtx) return canvas;
  outCtx.fillStyle = '#ffffff';
  outCtx.fillRect(0, 0, trimmedW, height);
  outCtx.drawImage(canvas, minX, 0, trimmedW, height, 0, 0, trimmedW, height);
  return out;
}

/** Coupe le vide blanc en bas pour ne pas créer une page A4 quasi vide. */
function trimBottomWhitespace(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  let maxY = -1;

  for (let y = height - 1; y >= 0; y--) {
    let rowHasInk = false;
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      if (!isNearWhitePixel(data, i)) {
        rowHasInk = true;
        break;
      }
    }
    if (rowHasInk) {
      maxY = y;
      break;
    }
  }

  if (maxY < 0) return canvas;
  const pad = 8;
  const trimmedH = Math.min(height, maxY + 1 + pad);
  // Ne trim que s'il y a vraiment du vide (> ~3% en bas)
  if (trimmedH >= height * 0.97) return canvas;

  const out = document.createElement('canvas');
  out.width = width;
  out.height = trimmedH;
  const outCtx = out.getContext('2d');
  if (!outCtx) return canvas;
  outCtx.fillStyle = '#ffffff';
  outCtx.fillRect(0, 0, width, trimmedH);
  outCtx.drawImage(canvas, 0, 0, width, trimmedH, 0, 0, width, trimmedH);
  return out;
}

type BlockBox = { top: number; bottom: number };

/** Affine une coupure sur une rangée blanche (entre deux blocs). */
function findWhiteRowNear(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  idealY: number,
  searchPx: number,
  forbidden: BlockBox[]
): number {
  const start = Math.max(1, Math.floor(idealY - searchPx));
  const end = Math.min(height - 1, Math.ceil(idealY + searchPx));

  let bestY = Math.min(Math.max(idealY, 1), height - 1);
  let bestScore = -1;

  for (let y = start; y <= end; y++) {
    if (forbidden.some((b) => y > b.top + 1 && y < b.bottom - 1)) continue;

    const row = ctx.getImageData(0, y, width, 1).data;
    let white = 0;
    let samples = 0;
    for (let x = 0; x < width; x += 4) {
      samples++;
      if (isNearWhitePixel(row, x * 4)) white++;
    }
    const score = white / Math.max(1, samples);
    const biased = score - Math.abs(y - idealY) / (searchPx * 50 + 1);
    if (score >= 0.9 && biased > bestScore) {
      bestScore = biased;
      bestY = y;
    }
  }

  return bestY;
}

/**
 * Mesure les blocs à ne jamais couper (sections, lignes de tableau, images…).
 * Coordonnées en pixels canvas.
 */
function collectKeepTogetherBlocks(
  root: HTMLElement,
  canvasWidth: number,
  canvasHeight: number
): BlockBox[] {
  const rootRect = root.getBoundingClientRect();
  const contentH = Math.max(root.scrollHeight, root.offsetHeight, 1);
  const contentW = Math.max(root.scrollWidth, root.offsetWidth, 1);
  const scaleY = canvasHeight / contentH;
  const scaleX = canvasWidth / contentW;
  void scaleX;

  const nodes = new Set<Element>();

  // Pas de <table> entier : on garde thead + chaque <tr> pour couper entre les lignes
  root.querySelectorAll('[data-pdf-keep]').forEach((n) => nodes.add(n));
  root.querySelectorAll('thead, tbody tr, img').forEach((n) => nodes.add(n));

  Array.from(root.children).forEach((child) => {
    if (!(child instanceof HTMLElement) || child.classList.contains('no-print')) return;
    if (child.hasAttribute('data-pdf-keep') || child.offsetHeight >= 24) nodes.add(child);
    Array.from(child.children).forEach((c) => {
      if (!(c instanceof HTMLElement) || c.classList.contains('no-print')) return;
      if (c.hasAttribute('data-pdf-keep') || c.tagName === 'TABLE') return;
      if (c.offsetHeight >= 28) nodes.add(c);
    });
  });

  const raw: BlockBox[] = [];
  nodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (node.classList.contains('no-print') || node.closest('.no-print')) return;
    // Ne pas traiter le tableau comme un seul bloc insécable
    if (node.tagName === 'TABLE') return;

    const r = node.getBoundingClientRect();
    if (r.height < 10 || r.width < 10) return;

    const top = (r.top - rootRect.top) * scaleY;
    const bottom = (r.bottom - rootRect.top) * scaleY;
    if (bottom <= top) return;

    raw.push({
      top: Math.max(0, top),
      bottom: Math.min(canvasHeight, bottom),
    });
  });

  raw.sort((a, b) => a.top - b.top || a.bottom - b.bottom);

  // Fusionne uniquement les mesures quasi identiques (même zone), pas les lignes voisines
  const merged: BlockBox[] = [];
  for (const b of raw) {
    const last = merged[merged.length - 1];
    if (last) {
      const overlap = Math.min(last.bottom, b.bottom) - Math.max(last.top, b.top);
      const minH = Math.min(last.bottom - last.top, b.bottom - b.top);
      if (overlap > minH * 0.75) {
        last.top = Math.min(last.top, b.top);
        last.bottom = Math.max(last.bottom, b.bottom);
        continue;
      }
    }
    merged.push({ ...b });
  }

  return merged;
}

/**
 * Coupe intelligemment : uniquement entre deux blocs entiers.
 * Ne coupe jamais au milieu d'une section, ligne de tableau, image, etc.
 */
function findElementAwareCutY(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pageStartY: number,
  idealY: number,
  pageHeightPx: number,
  blocks: BlockBox[]
): number {
  const pad = 6;
  const hardMax = Math.min(height, idealY);
  const softMin = pageStartY + Math.floor(pageHeightPx * 0.35);
  const hardMin = pageStartY + 48;

  const cutsInside = (y: number) =>
    blocks.some((b) => y > b.top + pad && y < b.bottom - pad);

  const candidates: number[] = [];

  // 1) Fin d'un bloc entièrement contenu dans la page
  for (const b of blocks) {
    if (b.top < pageStartY - pad) continue;
    const cut = Math.ceil(b.bottom) + pad;
    if (cut > hardMin && cut <= hardMax && !cutsInside(cut)) {
      candidates.push(cut);
    }
  }

  // 2) Juste avant un bloc qui dépasserait le bas de page (évite de le scinder)
  for (const b of blocks) {
    if (b.top >= hardMax) continue;
    if (b.bottom <= hardMax) continue; // tient entièrement
    if (b.top <= pageStartY + pad) continue; // a commencé plus haut : géré par lignes/tr
    const cut = Math.floor(b.top) - pad;
    if (cut > hardMin && cut <= hardMax && !cutsInside(cut)) {
      candidates.push(cut);
    }
  }

  // Préférer la coupure la plus proche du bas de page (utilise l'espace)
  let best = -1;
  for (const c of candidates) {
    if (c >= softMin && c > best) best = c;
  }
  // Sinon accepter une page plus courte pour ne rien couper
  if (best < 0) {
    for (const c of candidates) {
      if (c > best) best = c;
    }
  }

  if (best > pageStartY) {
    return findWhiteRowNear(ctx, width, height, best, 10, blocks);
  }

  // 3) Bloc plus haut qu'une page (ex. très longue table) : couper entre sous-blocs / rangées blanches
  //    en restant hors de l'intérieur des petits blocs (tr)
  const fallback = findWhiteRowNear(
    ctx,
    width,
    height,
    hardMax,
    Math.max(20, Math.floor(pageHeightPx * 0.12)),
    blocks.filter((b) => b.bottom - b.top < pageHeightPx * 0.9)
  );

  if (fallback > hardMin && !cutsInside(fallback)) return fallback;

  // Dernier recours : reculer avant le premier bloc chevauchant
  const straddler = blocks.find(
    (b) => b.top < hardMax && b.bottom > hardMax && b.top > pageStartY + pad
  );
  if (straddler) {
    return Math.max(hardMin, Math.floor(straddler.top) - pad);
  }

  return Math.max(hardMin, hardMax - 8);
}

function collectModuleTargets(
  root: HTMLElement,
  moduleIds: string[],
  canvasHeight: number
): PullTarget[] {
  if (!moduleIds.length) return [];
  const rootRect = root.getBoundingClientRect();
  const contentH = Math.max(root.scrollHeight, root.offsetHeight, 1);
  const scaleY = canvasHeight / contentH;
  const targets: PullTarget[] = [];

  moduleIds.forEach((id) => {
    const el = root.querySelector(`[data-pdf-module="${id}"]`);
    if (!(el instanceof HTMLElement)) return;
    const r = el.getBoundingClientRect();
    const top = (r.top - rootRect.top) * scaleY;
    const bottom = (r.bottom - rootRect.top) * scaleY;
    if (bottom > top) targets.push({ top, bottom });
  });

  return targets;
}

function collectForcedCutYs(
  root: HTMLElement,
  breakAfterModuleIds: string[],
  canvasHeight: number
): number[] {
  return collectModuleTargets(root, breakAfterModuleIds, canvasHeight)
    .map((t) => Math.round(t.bottom + 4))
    .filter((y) => y > 20 && y < canvasHeight - 8)
    .sort((a, b) => a - b);
}

type PageSlice = {
  startY: number;
  endY: number;
  sliceH: number;
  overflowsPage: boolean;
};

function preparePagedCanvas(
  sourceCanvas: HTMLCanvasElement,
  pageWidthMm: number,
  pageHeightMm: number
): { canvas: HTMLCanvasElement; pageHeightPx: number; ctx: CanvasRenderingContext2D } {
  const pageHeightPx = Math.max(
    1,
    Math.round((sourceCanvas.width * pageHeightMm) / pageWidthMm)
  );
  let canvas = trimHorizontalWhitespace(sourceCanvas);
  canvas = trimBottomWhitespace(canvas);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Impossible de lire la capture PDF.');
  return { canvas, pageHeightPx, ctx };
}

/** True si la tranche est quasi blanche (page vide). */
function isSliceMostlyEmpty(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  startY: number,
  sliceH: number
): boolean {
  if (sliceH < 12) return true;
  const y0 = Math.max(0, Math.floor(startY));
  const h = Math.min(Math.ceil(sliceH), canvas.height - y0);
  if (h <= 0) return true;

  const { data } = ctx.getImageData(0, y0, canvas.width, h);
  let ink = 0;
  let samples = 0;
  // Échantillonnage rapide
  for (let i = 0; i < data.length; i += 32 * 4) {
    samples += 1;
    if (!isNearWhitePixel(data, i)) ink += 1;
  }
  return ink / Math.max(1, samples) < 0.004;
}

function computePageSlices(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  pageHeightPx: number,
  blocks: BlockBox[],
  forcedCutYs: number[] = [],
  pullTargets: PullTarget[] = [],
  dropEmptyPages = false
): PageSlice[] {
  const slices: PageSlice[] = [];
  let y = 0;
  // Limite de sécurité haute : documents très longs (beaucoup d'articles)
  const maxPages = Math.max(500, Math.ceil(canvas.height / Math.max(pageHeightPx * 0.15, 1)) + 10);
  let guard = 0;

  while (y < canvas.height - 1 && guard < maxPages) {
    guard += 1;
    const remaining = canvas.height - y;
    const idealCut = y + pageHeightPx;

    // Coupure manuelle : toujours créer une nouvelle page pour le contenu qui suit,
    // même si tout tiendrait encore sur une seule page A4.
    const nextForced = forcedCutYs.find(
      (cut) => cut > y + 40 && cut < canvas.height - 10
    );

    if (nextForced != null && nextForced < y + remaining - 8) {
      let cutY = findWhiteRowNear(ctx, canvas.width, canvas.height, nextForced, 12, blocks);
      if (cutY <= y + 40) cutY = nextForced;
      cutY = Math.min(cutY, canvas.height);
      const finalSliceH = Math.max(40, cutY - y);
      slices.push({
        startY: y,
        endY: y + finalSliceH,
        sliceH: finalSliceH,
        overflowsPage: finalSliceH > pageHeightPx + 2,
      });
      y += finalSliceH;
      continue;
    }

    if (remaining <= pageHeightPx + 2) {
      slices.push({
        startY: y,
        endY: canvas.height,
        sliceH: remaining,
        overflowsPage: false,
      });
      break;
    }

    let cutY = findElementAwareCutY(
      ctx,
      canvas.width,
      canvas.height,
      y,
      idealCut,
      pageHeightPx,
      blocks
    );

    cutY = extendCutForPulledModules(
      cutY,
      y,
      idealCut,
      pageHeightPx,
      canvas.height,
      pullTargets
    );

    const sliceH = Math.max(40, cutY - y);
    const advanced = sliceH < Math.floor(pageHeightPx * 0.05);
    const finalSliceH = advanced ? Math.min(pageHeightPx, remaining) : sliceH;

    slices.push({
      startY: y,
      endY: y + finalSliceH,
      sliceH: finalSliceH,
      overflowsPage: finalSliceH > pageHeightPx + 2,
    });
    y += finalSliceH;
  }

  const raw = slices.length
    ? slices
    : [{ startY: 0, endY: canvas.height, sliceH: canvas.height, overflowsPage: false }];

  if (!dropEmptyPages) return raw;

  // PDF final : ne pas écrire les pages vides
  const filtered = raw.filter((slice, idx) => {
    if (idx === 0) return true;
    return !isSliceMostlyEmpty(canvas, ctx, slice.startY, slice.sliceH);
  });

  return filtered.length ? filtered : raw.slice(0, 1);
}

function renderSliceToCanvas(
  source: HTMLCanvasElement,
  slice: PageSlice,
  pageHeightPx: number
): HTMLCanvasElement {
  const pageCanvas = document.createElement('canvas');
  pageCanvas.width = source.width;
  pageCanvas.height = slice.overflowsPage ? slice.sliceH : pageHeightPx;
  const pageCtx = pageCanvas.getContext('2d');
  if (!pageCtx) throw new Error('Impossible de préparer une page PDF.');
  pageCtx.fillStyle = '#ffffff';
  pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
  pageCtx.drawImage(
    source,
    0,
    slice.startY,
    source.width,
    slice.sliceH,
    0,
    0,
    source.width,
    slice.sliceH
  );
  return pageCanvas;
}

/** Découpe le canvas en pages A4 sans scinder les éléments. */
function addCanvasAsA4Pages(
  pdf: jsPDF,
  sourceCanvas: HTMLCanvasElement,
  blocks: BlockBox[],
  forcedCutYs: number[] = [],
  pullTargets: PullTarget[] = [],
  hiddenPageStarts: number[] = []
): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const { canvas, pageHeightPx, ctx } = preparePagedCanvas(
    sourceCanvas,
    pageWidth,
    pageHeight
  );
  const hiddenSet = new Set(hiddenPageStarts.map((y) => Math.round(y)));
  let slices = computePageSlices(
    canvas,
    ctx,
    pageHeightPx,
    blocks,
    forcedCutYs,
    pullTargets,
    true // ne pas générer de pages vides dans le PDF
  );
  if (hiddenSet.size) {
    slices = slices.filter((s, idx) => idx === 0 || !hiddenSet.has(Math.round(s.startY)));
  }

  slices.forEach((slice, pageIndex) => {
    const pageCanvas = renderSliceToCanvas(canvas, slice, pageHeightPx);
    if (pageIndex > 0) pdf.addPage();

    if (pageIndex === slices.length - 1 && !slice.overflowsPage && slice.sliceH <= pageHeightPx + 2) {
      const drawH = (slice.sliceH * pageWidth) / canvas.width;
      pdf.addImage(canvasToPngDataUrl(pageCanvas), 'PNG', 0, 0, pageWidth, drawH, undefined, 'FAST');
    } else {
      pdf.addImage(
        canvasToPngDataUrl(pageCanvas),
        'PNG',
        0,
        0,
        pageWidth,
        pageHeight,
        undefined,
        'FAST'
      );
    }
  });
}

type VisualCaptureCache = {
  elementId: string;
  canvas: HTMLCanvasElement;
  pageHeightPx: number;
  blocks: BlockBox[];
  layout: PdfLayoutMeasure;
};

let visualCaptureCache: VisualCaptureCache | null = null;

async function captureElementCanvas(
  element: HTMLElement,
  elementId: string,
  scale: number
): Promise<{ canvas: HTMLCanvasElement; layout: PdfLayoutMeasure; blocks: BlockBox[] }> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const restoreImages = await embedImagesAsDataUrls(element);
  let restoreStyles: (() => void) | null = null;
  try {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise((r) => setTimeout(r, 40));

    // Après reflow images : figer les styles calculés (Tailwind v4 → RGB/inline)
    restoreStyles = inlineComputedStylesForCapture(element);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const layout = measurePdfLayoutFromElement(element);

    const width = A4_WIDTH_PX;
    const rootTop = element.getBoundingClientRect().top;
    const inkBottoms = Array.from(
      element.querySelectorAll('[data-pdf-module], [data-pdf-keep], tr, img')
    ).map((node) => {
      if (!(node instanceof HTMLElement) || node.classList.contains('no-print')) return 0;
      return node.getBoundingClientRect().bottom - rootTop;
    });
    const contentBottom = Math.max(0, ...inkBottoms, 1);
    const height = Math.max(Math.ceil(contentBottom + 16), 200);

    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: 20000,
      foreignObjectRendering: false,
      removeContainer: true,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc) => prepareCloneForExport(clonedDoc, elementId),
      ignoreElements: (el) =>
        el instanceof HTMLElement &&
        (el.classList.contains('no-print') || Boolean(el.closest('.no-print'))),
    });

    if (!canvas.width || !canvas.height) {
      throw new Error('La capture du document est vide.');
    }

    const blocks = collectKeepTogetherBlocks(element, canvas.width, canvas.height);
    return { canvas, layout, blocks };
  } finally {
    restoreStyles?.();
    restoreImages();
  }
}

/**
 * Capture le document pour l'aperçu visuel des pages (à appeler à l'ouverture du modal).
 */
export async function preparePdfVisualPreview(
  elementId: string
): Promise<PdfLayoutMeasure | null> {
  const element = document.getElementById(elementId);
  if (!element) return null;

  const restoreLayout = lockA4Layout(element);
  try {
    element.scrollIntoView({ block: 'nearest' });
    const { canvas, layout, blocks } = await captureElementCanvas(element, elementId, 1.35);
    const pageWidth = 210;
    const pageHeight = 297;
    const prepared = preparePagedCanvas(canvas, pageWidth, pageHeight);
    const maxY = prepared.canvas.height;
    const clampedBlocks = blocks
      .map((b) => ({
        top: Math.max(0, Math.min(b.top, maxY)),
        bottom: Math.max(0, Math.min(b.bottom, maxY)),
      }))
      .filter((b) => b.bottom - b.top >= 4);

    visualCaptureCache = {
      elementId,
      canvas: prepared.canvas,
      pageHeightPx: prepared.pageHeightPx,
      blocks: clampedBlocks,
      layout,
    };
    return layout;
  } catch (err) {
    console.error('Aperçu PDF visuel:', err);
    visualCaptureCache = null;
    // Fallback mesure seule
    return measurePdfLayout(elementId);
  } finally {
    restoreLayout();
  }
}

/** Libère la capture d'aperçu (fermeture du modal). */
export function disposePdfVisualPreview(): void {
  visualCaptureCache = null;
}

/**
 * Découpe la capture en miniatures A4 selon les coupures choisies (rapide, sans re-capture).
 */
export function buildPdfVisualPages(
  breakAfterModuleIds: string[] = [],
  pullToPreviousModuleIds: string[] = [],
  hiddenPageStarts: number[] = []
): PdfVisualPagePreview[] {
  const cache = visualCaptureCache;
  if (!cache) return [];

  const { canvas, pageHeightPx, blocks, layout } = cache;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  const scaleY = canvas.height / Math.max(layout.contentHeight, 1);
  const forcedCutYs = layout.modules
    .filter((m) => breakAfterModuleIds.includes(m.id))
    .map((m) => Math.round(m.bottom * scaleY + 4))
    .filter((y) => y > 20 && y < canvas.height - 8)
    .sort((a, b) => a - b);

  const pullTargets: PullTarget[] = layout.modules
    .filter((m) => pullToPreviousModuleIds.includes(m.id))
    .map((m) => ({ top: m.top * scaleY, bottom: m.bottom * scaleY }));

  const hiddenSet = new Set(hiddenPageStarts.map((y) => Math.round(y)));

  let slices = computePageSlices(
    canvas,
    ctx,
    pageHeightPx,
    blocks,
    forcedCutYs,
    pullTargets,
    false // garder les pages vides visibles pour pouvoir les supprimer
  );

  // Pages explicitement masquées par l'utilisateur
  if (hiddenSet.size) {
    slices = slices.filter((s, idx) => idx === 0 || !hiddenSet.has(Math.round(s.startY)));
  }

  const pages = slices.map((slice, pageIndex) => {
    const pageCanvas = renderSliceToCanvas(canvas, slice, pageHeightPx);
    // Cadre A4 blanc si la tranche est plus courte
    const framed = document.createElement('canvas');
    framed.width = canvas.width;
    framed.height = pageHeightPx;
    const fctx = framed.getContext('2d');
    if (fctx) {
      fctx.fillStyle = '#ffffff';
      fctx.fillRect(0, 0, framed.width, framed.height);
      if (slice.overflowsPage) {
        // Condensé : étirer pour voir tout le contenu dans le cadre A4
        fctx.drawImage(pageCanvas, 0, 0, framed.width, framed.height);
      } else {
        fctx.drawImage(pageCanvas, 0, 0);
      }
    }

    // Modules présents sur cette tranche (par géométrie, pas par index de plan)
    const pageModules = layout.modules.filter((m) => {
      const top = m.top * scaleY;
      const bottom = m.bottom * scaleY;
      return bottom > slice.startY + 4 && top < slice.endY - 4;
    });
    // Un module n’est « principal » que sur la page où il commence
    const primaryModules = pageModules.filter((m) => {
      const top = m.top * scaleY;
      return top >= slice.startY - 2 || pageModules.length === 1;
    });
    const modulesForPage = primaryModules.length ? primaryModules : pageModules;
    const emptyInk = isSliceMostlyEmpty(canvas, ctx, slice.startY, slice.sliceH);
    const isEmpty = emptyInk || (pageIndex > 0 && pageModules.length === 0);

    return {
      pageIndex,
      dataUrl: canvasToPngDataUrl(fctx ? framed : pageCanvas),
      fillRatio: slice.sliceH / pageHeightPx,
      modules: modulesForPage,
      moduleIds: modulesForPage.map((m) => m.id),
      startY: slice.startY,
      endY: slice.endY,
      sliceH: slice.sliceH,
      pageHeightPx,
      overflowsPage: slice.overflowsPage,
      scaleY,
      isEmpty,
    };
  });

  // On garde les pages vides visibles pour pouvoir les supprimer à la main
  return pages.map((p, pageIndex) => ({ ...p, pageIndex }));
}

/**
 * Trouve la coupure forcée la plus proche du début d'une page (pour la supprimer).
 */
export function findBreakAfterNearPageStart(
  layout: PdfLayoutMeasure,
  breakAfterModuleIds: string[],
  pageStartY: number,
  scaleY: number
): string | null {
  if (!breakAfterModuleIds.length) return null;
  let bestId: string | null = null;
  let bestDist = Infinity;

  breakAfterModuleIds.forEach((id) => {
    const mod = layout.modules.find((m) => m.id === id);
    if (!mod) return;
    const cutY = mod.bottom * scaleY + 4;
    const dist = Math.abs(cutY - pageStartY);
    if (dist < bestDist) {
      bestDist = dist;
      bestId = id;
    }
  });

  // Tolérance large : la coupe doit être près du début de la page vide
  if (bestId != null && bestDist < 120) return bestId;
  return bestId; // même si un peu plus loin, on prend le plus proche
}

/** Rectangle de surlignage (%) d'un module sur une page visuelle. */
export function getModuleHighlightRect(
  mod: PdfModuleMeasure,
  page: PdfVisualPagePreview
): { top: number; height: number } | null {
  const modTop = mod.top * page.scaleY;
  const modBottom = mod.bottom * page.scaleY;
  if (modBottom <= page.startY + 1 || modTop >= page.endY - 1) return null;

  const contentH = page.overflowsPage ? page.sliceH : page.pageHeightPx;
  const relTop = Math.max(0, modTop - page.startY);
  const relBottom = Math.min(contentH, modBottom - page.startY);
  if (relBottom <= relTop) return null;

  // Page condensée : le contenu est étiré sur tout le cadre A4
  const frameScale = page.overflowsPage ? page.pageHeightPx / page.sliceH : 1;
  const topPct = ((relTop * frameScale) / page.pageHeightPx) * 100;
  const heightPct = (Math.max(8, (relBottom - relTop) * frameScale) / page.pageHeightPx) * 100;

  return {
    top: Math.max(0, Math.min(100, topPct)),
    height: Math.max(1.2, Math.min(100 - topPct, heightPct)),
  };
}

function collectDomKeepBlocks(root: HTMLElement): { top: number; bottom: number }[] {
  const rootRect = root.getBoundingClientRect();
  const nodes = new Set<Element>();

  root.querySelectorAll('[data-pdf-module], [data-pdf-keep]').forEach((n) => nodes.add(n));
  root.querySelectorAll('thead, tbody tr, img').forEach((n) => nodes.add(n));

  const raw: { top: number; bottom: number }[] = [];
  nodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (node.classList.contains('no-print') || node.closest('.no-print')) return;
    if (node.tagName === 'TABLE') return;
    const r = node.getBoundingClientRect();
    if (r.height < 8 || r.width < 8) return;
    const top = Math.max(0, r.top - rootRect.top);
    const bottom = Math.max(top, r.bottom - rootRect.top);
    raw.push({ top, bottom });
  });

  raw.sort((a, b) => a.top - b.top || a.bottom - b.bottom);
  const merged: { top: number; bottom: number }[] = [];
  for (const b of raw) {
    const last = merged[merged.length - 1];
    if (last) {
      const overlap = Math.min(last.bottom, b.bottom) - Math.max(last.top, b.top);
      const minH = Math.min(last.bottom - last.top, b.bottom - b.top);
      if (overlap > minH * 0.75) {
        last.top = Math.min(last.top, b.top);
        last.bottom = Math.max(last.bottom, b.bottom);
        continue;
      }
    }
    merged.push({ ...b });
  }
  return merged;
}

/** Même logique de coupure que le PDF, en coordonnées DOM (sans lecture canvas). */
function findDomAwareCutY(
  pageStartY: number,
  idealY: number,
  pageHeightPx: number,
  contentHeight: number,
  blocks: { top: number; bottom: number }[],
  forcedCutYs: number[]
): number {
  const pad = 6;
  const hardMax = Math.min(contentHeight, idealY);
  const softMin = pageStartY + Math.floor(pageHeightPx * 0.35);
  const hardMin = pageStartY + 48;

  const nextForced = forcedCutYs.find((cut) => cut > pageStartY + 40);
  if (nextForced != null && nextForced <= hardMax + 2) {
    return Math.min(Math.max(nextForced, hardMin), contentHeight);
  }

  const cutsInside = (y: number) =>
    blocks.some((b) => y > b.top + pad && y < b.bottom - pad);

  const candidates: number[] = [];

  for (const b of blocks) {
    if (b.top < pageStartY - pad) continue;
    const cut = Math.ceil(b.bottom) + pad;
    if (cut > hardMin && cut <= hardMax && !cutsInside(cut)) candidates.push(cut);
  }

  for (const b of blocks) {
    if (b.top >= hardMax) continue;
    if (b.bottom <= hardMax) continue;
    if (b.top <= pageStartY + pad) continue;
    const cut = Math.floor(b.top) - pad;
    if (cut > hardMin && cut <= hardMax && !cutsInside(cut)) candidates.push(cut);
  }

  let best = -1;
  for (const c of candidates) {
    if (c >= softMin && c > best) best = c;
  }
  if (best < 0) {
    for (const c of candidates) {
      if (c > best) best = c;
    }
  }

  if (best > pageStartY) {
    if (nextForced != null && best > nextForced) {
      return Math.min(Math.max(nextForced, hardMin), contentHeight);
    }
    return best;
  }

  const straddler = blocks.find(
    (b) => b.top < hardMax && b.bottom > hardMax && b.top > pageStartY + pad
  );
  if (straddler) {
    return Math.max(hardMin, Math.floor(straddler.top) - pad);
  }

  return Math.max(hardMin, hardMax - 8);
}

function simulatePdfPageRanges(
  contentHeight: number,
  pageHeight: number,
  keepBlocks: { top: number; bottom: number }[],
  forcedCutYs: number[],
  pullTargets: PullTarget[] = []
): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  let y = 0;
  const maxPages = Math.max(500, Math.ceil(contentHeight / Math.max(pageHeight * 0.15, 1)) + 10);
  let guard = 0;

  while (y < contentHeight - 1 && guard < maxPages) {
    guard += 1;
    const remaining = contentHeight - y;

    // Coupure manuelle → nouvelle page même si le reste tiendrait encore
    const nextForced = forcedCutYs.find((cut) => cut > y + 40 && cut < contentHeight - 8);
    if (nextForced != null && nextForced < y + remaining - 6) {
      const cutY = Math.min(Math.max(nextForced, y + 40), contentHeight);
      ranges.push({ start: y, end: cutY });
      y = cutY;
      continue;
    }

    if (remaining <= pageHeight + 2) {
      ranges.push({ start: y, end: contentHeight });
      break;
    }

    const idealCut = y + pageHeight;
    let cutY = findDomAwareCutY(
      y,
      idealCut,
      pageHeight,
      contentHeight,
      keepBlocks,
      [] // les coupures forcées sont gérées juste au-dessus
    );
    cutY = extendCutForPulledModules(
      cutY,
      y,
      idealCut,
      pageHeight,
      contentHeight,
      pullTargets
    );
    let sliceH = Math.max(40, cutY - y);
    if (sliceH < Math.floor(pageHeight * 0.05)) {
      sliceH = Math.min(pageHeight, remaining);
    }

    ranges.push({ start: y, end: y + sliceH });
    y += sliceH;
  }

  const raw = ranges.length ? ranges : [{ start: 0, end: contentHeight }];
  // Retire les plages sans module (pages vides logiques)
  return raw;
}

function measurePdfLayoutFromElement(element: HTMLElement): PdfLayoutMeasure {
  void element.offsetHeight;

  const rootRect = element.getBoundingClientRect();
  const modules: PdfModuleMeasure[] = [];

  element.querySelectorAll('[data-pdf-module]').forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (node.classList.contains('no-print') || node.closest('.no-print')) return;
    const id = node.getAttribute('data-pdf-module');
    if (!id) return;
    const label = node.getAttribute('data-pdf-module-label') || id;
    const r = node.getBoundingClientRect();
    const top = Math.max(0, r.top - rootRect.top);
    const bottom = Math.max(top, r.bottom - rootRect.top);
    if (bottom - top < 8) return;
    modules.push({ id, label, top, bottom, height: bottom - top });
  });

  modules.sort((a, b) => a.top - b.top || a.bottom - b.bottom);

  const keepBlocks = collectDomKeepBlocks(element);
  const lastModuleBottom = modules.reduce((max, m) => Math.max(max, m.bottom), 0);
  const lastBlockBottom = keepBlocks.reduce((max, b) => Math.max(max, b.bottom), 0);

  // Hauteur utile = encre réelle (+ marge), pas le min-height A4 (sinon 1 page devient 2)
  const inkBottom = Math.max(lastModuleBottom, lastBlockBottom, 1);
  const contentHeight = Math.ceil(inkBottom + 16);

  return {
    modules,
    contentHeight,
    pageHeight: A4_HEIGHT_PX,
    keepBlocks,
  };
}

/**
 * Mesure les modules `[data-pdf-module]` pour l'aperçu de pagination.
 */
export function measurePdfLayout(elementId: string): PdfLayoutMeasure | null {
  const element = document.getElementById(elementId);
  if (!element) return null;

  const restoreLayout = lockA4Layout(element);
  try {
    return measurePdfLayoutFromElement(element);
  } finally {
    restoreLayout();
  }
}

/**
 * Répartit les modules sur des pages A4 — même moteur de coupe que le téléchargement PDF.
 */
export function planPdfPages(
  layout: PdfLayoutMeasure,
  breakAfterModuleIds: string[] = [],
  pullToPreviousModuleIds: string[] = []
): PdfPagePlan[] {
  const { modules, pageHeight, contentHeight, keepBlocks = [] } = layout;

  const forcedCutYs = modules
    .filter((m) => breakAfterModuleIds.includes(m.id))
    .map((m) => Math.round(m.bottom + 4))
    .filter((y) => y > 20 && y < contentHeight - 4)
    .sort((a, b) => a - b);

  const pullTargets: PullTarget[] = modules
    .filter((m) => pullToPreviousModuleIds.includes(m.id))
    .map((m) => ({ top: m.top, bottom: m.bottom }));

  const ranges = simulatePdfPageRanges(
    contentHeight,
    pageHeight,
    keepBlocks.length ? keepBlocks : modules.map((m) => ({ top: m.top, bottom: m.bottom })),
    forcedCutYs,
    pullTargets
  );

  if (!modules.length) {
    return ranges.map((range, pageIndex) => ({
      pageIndex,
      moduleIds: [],
      modules: [],
      fillRatio: (range.end - range.start) / pageHeight,
    }));
  }

  return ranges.map((range, pageIndex) => {
    // Module principal sur la page où il commence (ou chevauche le plus)
    const pageMods = modules.filter((m) => {
      const overlap = Math.min(m.bottom, range.end) - Math.max(m.top, range.start);
      if (overlap <= 0) return false;
      // Afficher le module sur la page où il démarre, ou s'il chevauche significativement
      return m.top >= range.start - 2 || overlap > m.height * 0.35;
    });

    // Éviter les doublons d'affichage : un module n'apparaît que sur la 1re page qu'il touche
    const unique: PdfModuleMeasure[] = [];
    pageMods.forEach((m) => {
      const earlier = ranges.slice(0, pageIndex).some((prev) => {
        const overlap = Math.min(m.bottom, prev.end) - Math.max(m.top, prev.start);
        return overlap > m.height * 0.35 || m.top >= prev.start - 2;
      });
      if (!earlier || (m.top >= range.start - 2 && m.top < range.end)) {
        if (!unique.some((u) => u.id === m.id)) unique.push(m);
      }
    });

    // Si rien (page de suite d'un grand tableau), indiquer la continuité
    const displayMods =
      unique.length > 0
        ? unique
        : modules
            .filter((m) => m.top < range.end && m.bottom > range.start)
            .slice(0, 1)
            .map((m) => ({
              ...m,
              label: `${m.label} (suite)`,
            }));

    return {
      pageIndex,
      moduleIds: displayMods.map((m) => m.id),
      modules: displayMods,
      fillRatio: (range.end - range.start) / pageHeight,
    };
  });
}

/**
 * Génère et télécharge un PDF A4 identique à l'aperçu.
 */
export async function downloadPDF(
  elementId: string,
  fileName: string,
  options: DownloadPdfOptions = {}
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    alert(`Impossible de trouver le document à télécharger.`);
    return false;
  }

  let restoreLayout: (() => void) | null = null;
  let restoreImages: (() => void) | null = null;
  let restoreStyles: (() => void) | null = null;

  try {
    element.scrollIntoView({ block: 'nearest' });
    restoreLayout = lockA4Layout(element);

    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    restoreImages = await embedImagesAsDataUrls(element);
    // Laisser le navigateur recalculer le layout A4
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise((r) => setTimeout(r, 50));

    restoreStyles = inlineComputedStylesForCapture(element);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const width = A4_WIDTH_PX;
    const rootTop = element.getBoundingClientRect().top;
    const inkBottoms = Array.from(
      element.querySelectorAll('[data-pdf-module], [data-pdf-keep], tr, img')
    ).map((node) => {
      if (!(node instanceof HTMLElement) || node.classList.contains('no-print')) return 0;
      return node.getBoundingClientRect().bottom - rootTop;
    });
    const contentBottom = Math.max(0, ...inkBottoms, 1);
    // Capture sur le contenu réel ; le trim bas enlève le blanc restant
    const height = Math.max(Math.ceil(contentBottom + 16), 200);

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: 20000,
      foreignObjectRendering: false,
      removeContainer: true,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc) => prepareCloneForExport(clonedDoc, elementId),
      ignoreElements: (el) =>
        el instanceof HTMLElement &&
        (el.classList.contains('no-print') || Boolean(el.closest('.no-print'))),
    });

    if (!canvas.width || !canvas.height) {
      throw new Error('La capture du document est vide.');
    }

    // Mesurer les blocs pendant que le layout A4 est encore actif
    const keepBlocks = collectKeepTogetherBlocks(element, canvas.width, canvas.height);
    const forcedCutYs = collectForcedCutYs(
      element,
      options.breakAfterModuleIds || [],
      canvas.height
    );
    const pullTargets = collectModuleTargets(
      element,
      options.pullToPreviousModuleIds || [],
      canvas.height
    );

    restoreStyles?.();
    restoreStyles = null;
    restoreImages?.();
    restoreImages = null;
    restoreLayout?.();
    restoreLayout = null;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    addCanvasAsA4Pages(
      pdf,
      canvas,
      keepBlocks,
      forcedCutYs,
      pullTargets,
      options.hiddenPageStarts || []
    );

    const cleanFileName = `${fileName.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    const blob = pdf.output('blob');
    if (!(blob instanceof Blob) || blob.size < 200) {
      throw new Error('Le fichier PDF généré est invalide.');
    }

    const pdfBlob =
      blob.type === 'application/pdf'
        ? blob
        : new Blob([await blob.arrayBuffer()], { type: 'application/pdf' });

    triggerBrowserDownload(pdfBlob, cleanFileName);
    return true;
  } catch (error) {
    restoreStyles?.();
    restoreImages?.();
    restoreLayout?.();
    console.error('Erreur génération PDF:', error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Impossible de générer le PDF. Réessayez.';
    alert(`Impossible de générer le PDF : ${message}`);
    return false;
  }
}

/**
 * Impression navigateur (bouton Imprimer uniquement).
 */
export function printDocument(elementId: string): void {
  const element = document.getElementById(elementId);
  if (!element) {
    alert(`Impossible de trouver le document à imprimer.`);
    return;
  }

  const styleId = 'pdf-print-override-styles';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  styleEl.innerHTML = `
    @media print {
      body * { visibility: hidden !important; }
      #${elementId}, #${elementId} * { visibility: visible !important; }
      #${elementId} {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 210mm !important;
        max-width: 210mm !important;
        min-height: 297mm !important;
        margin: 0 !important;
        padding: 12mm !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        background: white !important;
      }
      .no-print { display: none !important; }
      @page { size: A4 portrait; margin: 0; }
    }
  `;

  setTimeout(() => {
    window.print();
  }, 100);
}
