/** Dates stockées en ISO `YYYY-MM-DD`, affichées en français `JJ/MM/AAAA`. */

export const MONTHS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const;

export const DAYS_FR_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const;

/** Convertit une Date locale en `YYYY-MM-DD` (sans décalage UTC). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse `YYYY-MM-DD` en Date locale (midi évite les soucis de fuseau). */
export function parseISODate(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

/** Affiche une date ISO ou Date en `JJ/MM/AAAA`. */
export function formatDateFR(value: string | Date | undefined | null, fallback = '—'): string {
  if (value == null || value === '') return fallback;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return fallback;
    return value.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Parse saisie utilisateur `JJ/MM/AAAA` → `YYYY-MM-DD`, ou null si invalide. */
export function parseFrenchDateInput(text: string): string | null {
  const cleaned = text.trim().replace(/\./g, '/').replace(/-/g, '/');
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(cleaned);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day, 12, 0, 0);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return toISODate(d);
}
