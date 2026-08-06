import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

/** Largeur A4 à 96dpi — le PDF et le preview partagent ces proportions. */
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123; // 794 * 297/210
const A4_PADDING_PX = 40;

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

async function fetchAsDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const response = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'reload' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Lecture image impossible'));
    reader.readAsDataURL(blob);
  });
}

/** Embarque logo/cachet/signature en data URL pour éviter un canvas « tainted ». */
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
        const dataUrl = await fetchAsDataUrl(src);
        img.removeAttribute('crossorigin');
        img.src = dataUrl;
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

/** Découpe le canvas en pages A4 sans scinder les éléments. */
function addCanvasAsA4Pages(
  pdf: jsPDF,
  sourceCanvas: HTMLCanvasElement,
  blocks: BlockBox[]
): void {
  const canvas = trimHorizontalWhitespace(sourceCanvas);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Impossible de lire la capture PDF.');

  // Le trim horizontal ne change pas Y ; les blocs restent valides
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageHeightPx = Math.max(1, Math.round((canvas.width * pageHeight) / pageWidth));

  let y = 0;
  let pageIndex = 0;

  while (y < canvas.height - 1) {
    const remaining = canvas.height - y;

    if (remaining <= pageHeightPx + 2) {
      const sliceH = remaining;
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceH;
      const pageCtx = pageCanvas.getContext('2d');
      if (!pageCtx) throw new Error('Impossible de préparer une page PDF.');
      pageCtx.fillStyle = '#ffffff';
      pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      pageCtx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

      const drawH = (sliceH * pageWidth) / canvas.width;
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(canvasToPngDataUrl(pageCanvas), 'PNG', 0, 0, pageWidth, drawH, undefined, 'FAST');
      break;
    }

    const idealCut = y + pageHeightPx;
    const cutY = findElementAwareCutY(
      ctx,
      canvas.width,
      canvas.height,
      y,
      idealCut,
      pageHeightPx,
      blocks
    );
    const sliceH = Math.max(40, cutY - y);

    // Garde-fou anti-boucle : avancer d'au moins ~5% de page
    const advanced = sliceH < Math.floor(pageHeightPx * 0.05);
    const finalSliceH = advanced ? Math.min(pageHeightPx, remaining) : sliceH;

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = pageHeightPx;
    const pageCtx = pageCanvas.getContext('2d');
    if (!pageCtx) throw new Error('Impossible de préparer une page PDF.');
    pageCtx.fillStyle = '#ffffff';
    pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    pageCtx.drawImage(canvas, 0, y, canvas.width, finalSliceH, 0, 0, canvas.width, finalSliceH);

    if (pageIndex > 0) pdf.addPage();
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

    y += finalSliceH;
    pageIndex += 1;
    if (pageIndex > 40) break;
  }
}

/**
 * Génère et télécharge un PDF A4 identique à l'aperçu.
 */
export async function downloadPDF(elementId: string, fileName: string): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    alert(`Impossible de trouver le document à télécharger.`);
    return false;
  }

  let restoreLayout: (() => void) | null = null;
  let restoreImages: (() => void) | null = null;

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

    const width = A4_WIDTH_PX;
    const height = Math.max(element.scrollHeight, element.offsetHeight, A4_HEIGHT_PX);

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

    addCanvasAsA4Pages(pdf, canvas, keepBlocks);

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
