import { DocumentType, InvoiceDocument } from '../types';

export function isDocumentNumberUnique(
  numberStr: string,
  currentDocId: string | undefined,
  existingDocuments: InvoiceDocument[]
): boolean {
  if (!numberStr?.trim()) return false;
  const target = numberStr.trim().toUpperCase();
  return !existingDocuments.some(
    (doc) => doc.id !== currentDocId && doc.number.trim().toUpperCase() === target
  );
}

/** Utilitaire local (sans persistance) — la numérotation officielle passe par Supabase. */
export function peekNextDocumentNumber(
  type: DocumentType,
  existingDocuments: InvoiceDocument[] = [],
  year?: number
): string {
  const currentYear = year || new Date().getFullYear();
  const prefix = type === 'devis' ? 'DEV' : 'FAC';
  let maxSeq = 0;

  const pattern = new RegExp(`^${prefix}-${currentYear}-(\\d+)$`, 'i');
  existingDocuments.forEach((doc) => {
    const match = doc.number.trim().toUpperCase().match(pattern);
    if (match?.[1]) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  });

  return `${prefix}-${currentYear}-${String(maxSeq + 1).padStart(5, '0')}`;
}
