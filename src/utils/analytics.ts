import { InvoiceDocument } from '../types';
import { calculateDocumentTotals } from './currency';

/** Factures émises non payées (même règle partout : Documents + Stats). */
export const UNPAID_FACTURE_STATUSES = [
  'en_attente',
  'en_attente_paiement',
  'en_retard',
  'commande',
  'en_cours',
  'pose',
  'livre',
] as const;

/** Devis encore dans le pipeline commercial (bandeau Documents). */
export const ACTIVE_DEVIS_STATUSES = [
  'en_attente',
  'accepte',
  'commande',
  'en_cours',
  'pose',
  'livre',
] as const;

export function isExcludedFromFinancials(status: string): boolean {
  return status === 'annulee' || status === 'refuse';
}

/** Parse YYYY-MM-DD en date locale (évite le décalage UTC qui fausse le mois du graphique). */
export function parseDocumentDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (m) {
    const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(dateStr);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function getDocumentTotals(doc: InvoiceDocument) {
  return calculateDocumentTotals(doc.items, doc.taxRate);
}

export interface FinancialMetrics {
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  totalFactured: number;
  totalFacturedHT: number;
  totalDevisPipeline: number;
  totalDevisVolume: number;
  countPaid: number;
  countPending: number;
  countOverdue: number;
  countFactures: number;
  countDevis: number;
  countDevisConverted: number;
  paymentRate: number;
  devisConversionRate: number;
}

/**
 * Totaux financiers uniques — source de vérité pour le bandeau Documents et le dashboard Stats.
 */
export function computeFinancialMetrics(documents: InvoiceDocument[]): FinancialMetrics {
  let totalPaid = 0;
  let totalPending = 0;
  let totalOverdue = 0;
  let totalFactured = 0;
  let totalFacturedHT = 0;
  let totalDevisPipeline = 0;
  let totalDevisVolume = 0;
  let countPaid = 0;
  let countPending = 0;
  let countOverdue = 0;
  let countFactures = 0;
  let countDevis = 0;
  let countDevisConverted = 0;

  for (const doc of documents) {
    if (isExcludedFromFinancials(doc.status)) continue;

    const totals = getDocumentTotals(doc);

    if (doc.type === 'facture') {
      countFactures++;
      totalFactured += totals.totalTTC;
      totalFacturedHT += totals.totalHT;

      if (doc.status === 'payee') {
        totalPaid += totals.totalTTC;
        countPaid++;
      } else if ((UNPAID_FACTURE_STATUSES as readonly string[]).includes(doc.status)) {
        totalPending += totals.totalTTC;
        countPending++;
        if (doc.status === 'en_retard') {
          totalOverdue += totals.totalTTC;
          countOverdue++;
        }
      }
    } else if (doc.type === 'devis') {
      countDevis++;
      totalDevisVolume += totals.totalTTC;

      if ((ACTIVE_DEVIS_STATUSES as readonly string[]).includes(doc.status)) {
        totalDevisPipeline += totals.totalTTC;
      }

      if (['accepte', 'converti', 'commande', 'pose', 'livre'].includes(doc.status)) {
        countDevisConverted++;
      }
    }
  }

  return {
    totalPaid,
    totalPending,
    totalOverdue,
    totalFactured,
    totalFacturedHT,
    totalDevisPipeline,
    totalDevisVolume,
    countPaid,
    countPending,
    countOverdue,
    countFactures,
    countDevis,
    countDevisConverted,
    paymentRate: totalFactured > 0 ? Math.round((totalPaid / totalFactured) * 100) : 0,
    devisConversionRate: countDevis > 0 ? Math.round((countDevisConverted / countDevis) * 100) : 0,
  };
}

export interface MonthlyPoint {
  month: string;
  yearMonth: string;
  paye: number;
  factured: number;
  devis: number;
}

/**
 * Série mensuelle pour le line/area chart.
 * Les sommes `paye` et `factured` correspondent exactement aux KPI
 * (les documents sans date sont affectés au mois courant).
 */
export function computeMonthlySeries(documents: InvoiceDocument[]): MonthlyPoint[] {
  const monthNames = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
  const map = new Map<string, MonthlyPoint>();
  const now = new Date();
  const fallbackKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const ensure = (key: string) => {
    if (!map.has(key)) {
      const [y, m] = key.split('-').map(Number);
      map.set(key, {
        month: `${monthNames[m - 1]} ${String(y).slice(2)}`,
        yearMonth: key,
        paye: 0,
        factured: 0,
        devis: 0,
      });
    }
    return map.get(key)!;
  };

  for (const doc of documents) {
    if (isExcludedFromFinancials(doc.status)) continue;

    const d = parseDocumentDate(doc.date);
    const key = d
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      : fallbackKey;
    const entry = ensure(key);
    const ttc = getDocumentTotals(doc).totalTTC;

    if (doc.type === 'facture') {
      entry.factured += ttc;
      if (doc.status === 'payee') entry.paye += ttc;
    } else if (
      doc.type === 'devis' &&
      (ACTIVE_DEVIS_STATUSES as readonly string[]).includes(doc.status)
    ) {
      entry.devis += ttc;
    }
  }

  const keys = Array.from(map.keys()).sort();
  if (keys.length >= 2) {
    const [sy, sm] = keys[0].split('-').map(Number);
    const [ey, em] = keys[keys.length - 1].split('-').map(Number);
    let y = sy;
    let m = sm;
    while (y < ey || (y === ey && m <= em)) {
      ensure(`${y}-${String(m).padStart(2, '0')}`);
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
}
