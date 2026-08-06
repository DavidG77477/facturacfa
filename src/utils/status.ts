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
  bgClass: string;
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
    bgClass: 'bg-blue-50 text-blue-700 border-blue-200',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    badgeBg: 'bg-blue-100 text-blue-800',
    icon: CheckCircle2,
  },
  en_attente_paiement: {
    id: 'en_attente_paiement',
    label: 'En attente de paiement',
    bgClass: 'bg-amber-50 text-amber-700 border-amber-200',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    badgeBg: 'bg-amber-100 text-amber-800',
    icon: Clock,
  },
  en_attente: {
    id: 'en_attente',
    label: 'En attente',
    bgClass: 'bg-amber-50 text-amber-700 border-amber-200',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    badgeBg: 'bg-amber-100 text-amber-800',
    icon: Clock,
  },
  commande: {
    id: 'commande',
    label: 'Commandé',
    bgClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    textClass: 'text-cyan-700',
    borderClass: 'border-cyan-200',
    badgeBg: 'bg-cyan-100 text-cyan-800',
    icon: ShoppingBag,
  },
  en_cours: {
    id: 'en_cours',
    label: 'En fabrication / En cours',
    bgClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    textClass: 'text-indigo-700',
    borderClass: 'border-indigo-200',
    badgeBg: 'bg-indigo-100 text-indigo-800',
    icon: Wrench,
  },
  pose: {
    id: 'pose',
    label: 'Posé / Installé',
    bgClass: 'bg-blue-50 text-blue-700 border-blue-200',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    badgeBg: 'bg-blue-100 text-blue-800',
    icon: Check,
  },
  livre: {
    id: 'livre',
    label: 'Livré',
    bgClass: 'bg-purple-50 text-purple-700 border-purple-200',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-200',
    badgeBg: 'bg-purple-100 text-purple-800',
    icon: Truck,
  },
  accepte: {
    id: 'accepte',
    label: 'Accepté',
    bgClass: 'bg-blue-50 text-blue-700 border-blue-200',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    badgeBg: 'bg-blue-100 text-blue-800',
    icon: CheckCircle2,
  },
  refuse: {
    id: 'refuse',
    label: 'Refusé',
    bgClass: 'bg-rose-50 text-rose-700 border-rose-200',
    textClass: 'text-rose-700',
    borderClass: 'border-rose-200',
    badgeBg: 'bg-rose-100 text-rose-800',
    icon: XCircle,
  },
  en_retard: {
    id: 'en_retard',
    label: 'En retard',
    bgClass: 'bg-red-50 text-red-700 border-red-200',
    textClass: 'text-red-700',
    borderClass: 'border-red-200',
    badgeBg: 'bg-red-100 text-red-800',
    icon: AlertTriangle,
  },
  brouillon: {
    id: 'brouillon',
    label: 'Brouillon',
    bgClass: 'bg-slate-100 text-slate-700 border-slate-200',
    textClass: 'text-slate-700',
    borderClass: 'border-slate-200',
    badgeBg: 'bg-slate-200 text-slate-800',
    icon: FileText,
  },
  annulee: {
    id: 'annulee',
    label: 'Annulée',
    bgClass: 'bg-slate-100 text-slate-600 border-slate-200',
    textClass: 'text-slate-600',
    borderClass: 'border-slate-200',
    badgeBg: 'bg-slate-200 text-slate-700',
    icon: XCircle,
  },
  converti: {
    id: 'converti',
    label: 'Converti en Facture',
    bgClass: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    textClass: 'text-fuchsia-700',
    borderClass: 'border-fuchsia-200',
    badgeBg: 'bg-fuchsia-100 text-fuchsia-800',
    icon: RefreshCw,
  },
};

export const STATUS_LIST = Object.values(ALL_STATUSES);

export function getStatusInfo(statusKey: string): StatusItem {
  if (ALL_STATUSES[statusKey]) {
    return ALL_STATUSES[statusKey];
  }
  // Return custom format for any other string
  return {
    id: statusKey,
    label: statusKey,
    bgClass: 'bg-slate-100 text-slate-800 border-slate-300',
    textClass: 'text-slate-800',
    borderClass: 'border-slate-300',
    badgeBg: 'bg-slate-200 text-slate-800',
    icon: Tag,
  };
}
