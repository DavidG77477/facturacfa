import {
  CheckCircle2,
  Clock,
  ShoppingBag,
  Wrench,
  Truck,
  AlertTriangle,
  XCircle,
  FileText,
  RefreshCw,
  Check,
  Tag,
} from 'lucide-react';
import React from 'react';

export interface StatusItem {
  id: string;
  label: string;
  /** Styles UI app (glass sombre) — texte clair sur fond teinté */
  bgClass: string;
  /** Styles papier PDF (fond clair) */
  pdfBgClass: string;
  textClass: string;
  borderClass: string;
  badgeBg: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface StatusOption {
  id: string;
  label: string;
}

export const ALL_STATUSES: Record<string, StatusItem> = {
  payee: {
    id: 'payee',
    label: 'Payé',
    bgClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
    pdfBgClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    textClass: 'text-emerald-200',
    borderClass: 'border-emerald-400/40',
    badgeBg: 'bg-emerald-500/20 text-emerald-200',
    icon: CheckCircle2,
  },
  en_attente_paiement: {
    id: 'en_attente_paiement',
    label: 'En attente de paiement',
    bgClass: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
    pdfBgClass: 'bg-amber-50 text-amber-800 border-amber-200',
    textClass: 'text-amber-200',
    borderClass: 'border-amber-400/40',
    badgeBg: 'bg-amber-500/20 text-amber-200',
    icon: Clock,
  },
  en_attente: {
    id: 'en_attente',
    label: 'En attente',
    bgClass: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
    pdfBgClass: 'bg-amber-50 text-amber-800 border-amber-200',
    textClass: 'text-amber-200',
    borderClass: 'border-amber-400/40',
    badgeBg: 'bg-amber-500/20 text-amber-200',
    icon: Clock,
  },
  commande: {
    id: 'commande',
    label: 'Commandé',
    bgClass: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40',
    pdfBgClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    textClass: 'text-cyan-200',
    borderClass: 'border-cyan-400/40',
    badgeBg: 'bg-cyan-500/20 text-cyan-200',
    icon: ShoppingBag,
  },
  en_cours: {
    id: 'en_cours',
    label: 'En fabrication / En cours',
    bgClass: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40',
    pdfBgClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    textClass: 'text-indigo-200',
    borderClass: 'border-indigo-400/40',
    badgeBg: 'bg-indigo-500/20 text-indigo-200',
    icon: Wrench,
  },
  pose: {
    id: 'pose',
    label: 'Posé / Installé',
    bgClass: 'bg-sky-500/20 text-sky-200 border-sky-400/40',
    pdfBgClass: 'bg-sky-50 text-sky-800 border-sky-200',
    textClass: 'text-sky-200',
    borderClass: 'border-sky-400/40',
    badgeBg: 'bg-sky-500/20 text-sky-200',
    icon: Check,
  },
  livre: {
    id: 'livre',
    label: 'Livré',
    bgClass: 'bg-violet-500/20 text-violet-200 border-violet-400/40',
    pdfBgClass: 'bg-violet-50 text-violet-800 border-violet-200',
    textClass: 'text-violet-200',
    borderClass: 'border-violet-400/40',
    badgeBg: 'bg-violet-500/20 text-violet-200',
    icon: Truck,
  },
  accepte: {
    id: 'accepte',
    label: 'Accepté',
    bgClass: 'bg-teal-500/20 text-teal-200 border-teal-400/40',
    pdfBgClass: 'bg-teal-50 text-teal-800 border-teal-200',
    textClass: 'text-teal-200',
    borderClass: 'border-teal-400/40',
    badgeBg: 'bg-teal-500/20 text-teal-200',
    icon: CheckCircle2,
  },
  refuse: {
    id: 'refuse',
    label: 'Refusé',
    bgClass: 'bg-rose-500/25 text-rose-100 border-rose-400/45',
    pdfBgClass: 'bg-rose-50 text-rose-800 border-rose-200',
    textClass: 'text-rose-100',
    borderClass: 'border-rose-400/45',
    badgeBg: 'bg-rose-500/25 text-rose-100',
    icon: XCircle,
  },
  en_retard: {
    id: 'en_retard',
    label: 'En retard',
    bgClass: 'bg-red-500/25 text-red-100 border-red-400/45',
    pdfBgClass: 'bg-red-50 text-red-800 border-red-200',
    textClass: 'text-red-100',
    borderClass: 'border-red-400/45',
    badgeBg: 'bg-red-500/25 text-red-100',
    icon: AlertTriangle,
  },
  brouillon: {
    id: 'brouillon',
    label: 'Brouillon',
    bgClass: 'bg-slate-500/25 text-slate-100 border-slate-400/40',
    pdfBgClass: 'bg-slate-100 text-slate-700 border-slate-200',
    textClass: 'text-slate-100',
    borderClass: 'border-slate-400/40',
    badgeBg: 'bg-slate-500/25 text-slate-100',
    icon: FileText,
  },
  annulee: {
    id: 'annulee',
    label: 'Annulée',
    bgClass: 'bg-slate-500/20 text-slate-200 border-slate-400/35',
    pdfBgClass: 'bg-slate-100 text-slate-600 border-slate-200',
    textClass: 'text-slate-200',
    borderClass: 'border-slate-400/35',
    badgeBg: 'bg-slate-500/20 text-slate-200',
    icon: XCircle,
  },
  converti: {
    id: 'converti',
    label: 'Converti en Facture',
    bgClass: 'bg-fuchsia-500/25 text-fuchsia-100 border-fuchsia-400/45',
    pdfBgClass: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200',
    textClass: 'text-fuchsia-100',
    borderClass: 'border-fuchsia-400/45',
    badgeBg: 'bg-fuchsia-500/25 text-fuchsia-100',
    icon: RefreshCw,
  },
};

export const STATUS_LIST = Object.values(ALL_STATUSES);

export function getStatusInfo(statusKey: string): StatusItem {
  if (ALL_STATUSES[statusKey]) {
    return ALL_STATUSES[statusKey];
  }
  return {
    id: statusKey,
    label: statusKey,
    bgClass: 'bg-white/10 text-slate-100 border-white/20',
    pdfBgClass: 'bg-slate-100 text-slate-800 border-slate-300',
    textClass: 'text-slate-100',
    borderClass: 'border-white/20',
    badgeBg: 'bg-white/10 text-slate-100',
    icon: Tag,
  };
}
