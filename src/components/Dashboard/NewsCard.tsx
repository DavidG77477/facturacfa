import React, { useEffect, useState } from 'react';
import { ExternalLink, Newspaper, Radio } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  source?: string;
  link?: string;
  pubDate?: string;
}

const FALLBACK_NEWS: NewsItem[] = [
  {
    id: 'f1',
    title: 'Astuce FacturaCFA : numérotez vos devis et factures pour un suivi clair en FCFA.',
    source: 'FacturaCFA',
  },
  {
    id: 'f2',
    title: 'Bamako : pensez à indiquer NIF et mentions légales en pied de page de vos documents.',
    source: 'Bonnes pratiques',
  },
  {
    id: 'f3',
    title: 'Conseil : convertissez un devis accepté en facture en un clic pour gagner du temps.',
    source: 'FacturaCFA',
  },
  {
    id: 'f4',
    title: 'Zone UEMOA : le Franc CFA (XOF) reste l’unité de référence pour vos échanges locaux.',
    source: 'Économie',
  },
];

const RSS_URL =
  'https://news.google.com/rss/search?q=Mali+économie+OR+Bamako+business&hl=fr&gl=ML&ceid=ML:fr';

const FETCH_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`;
const ROTATE_MS = 4500;

function extractSource(title: string): { cleanTitle: string; source?: string } {
  const parts = title.split(' - ');
  if (parts.length < 2) return { cleanTitle: title };
  const source = parts.pop()?.trim();
  return { cleanTitle: parts.join(' - ').trim(), source };
}

function formatRelative(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const diffH = Math.round((Date.now() - d.getTime()) / 36e5);
  if (diffH < 1) return 'À l’instant';
  if (diffH < 24) return `Il y a ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `Il y a ${diffD} j`;
}

export const NewsCard: React.FC = () => {
  const [items, setItems] = useState<NewsItem[]>(FALLBACK_NEWS);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(FETCH_URL);
        if (!res.ok) throw new Error('rss');
        const data = await res.json();
        if (cancelled) return;
        if (data.status === 'ok' && Array.isArray(data.items) && data.items.length) {
          const mapped: NewsItem[] = data.items.slice(0, 12).map((it: any, i: number) => {
            const { cleanTitle, source } = extractSource(String(it.title || 'Actualité'));
            return {
              id: String(it.guid || it.link || i),
              title: cleanTitle,
              source: source || it.author || 'Actualité',
              link: it.link,
              pubDate: it.pubDate,
            };
          });
          setItems(mapped.length ? mapped : FALLBACK_NEWS);
          setLive(mapped.length > 0);
        } else {
          setItems(FALLBACK_NEWS);
          setLive(false);
        }
      } catch {
        if (!cancelled) {
          setItems(FALLBACK_NEWS);
          setLive(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const refresh = window.setInterval(load, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
    };
  }, []);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [items.length]);

  const next = items[(index + 1) % Math.max(items.length, 1)];

  return (
    <section className="hover-lift bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-brand-ink to-brand-mid text-brand-paper">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <Newspaper className="w-4 h-4 text-brand-glow" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-bold text-sm tracking-tight truncate">Actualité Mali</h3>
            <p className="text-[10px] text-brand-sand/70 flex items-center gap-1">
              <Radio className="w-3 h-3 text-brand-glow" />
              {loading ? 'Chargement…' : live ? 'Fil en direct' : 'Infos & conseils'}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          {items.slice(0, 6).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === index % Math.min(items.length, 6) ? 'w-4 bg-brand-glow' : 'w-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Défilement vertical en fondu */}
      <div className="relative h-[92px] sm:h-[84px] px-4 sm:px-5 py-3 overflow-hidden">
        {items.map((item, i) => {
          const active = i === index;
          return (
            <div
              key={item.id}
              className={`absolute inset-x-4 sm:inset-x-5 top-3 bottom-3 flex flex-col justify-center transition-all duration-700 ease-out ${
                active
                  ? 'opacity-100 translate-y-0'
                  : i === (index - 1 + items.length) % items.length
                    ? 'opacity-0 -translate-y-4 pointer-events-none'
                    : 'opacity-0 translate-y-4 pointer-events-none'
              }`}
              aria-hidden={!active}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
                    {item.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    {item.source && (
                      <span className="font-bold text-brand-mid uppercase tracking-wider">
                        {item.source}
                      </span>
                    )}
                    {item.pubDate && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span>{formatRelative(item.pubDate)}</span>
                      </>
                    )}
                  </div>
                </div>
                {item.link && active && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover-press shrink-0 p-2 rounded-xl bg-brand-mist text-brand-ink border border-brand-ink/10"
                    title="Ouvrir l’article"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bandeau défilant continu (titres suivants) */}
      <div className="border-t border-slate-100 bg-brand-mist/40 overflow-hidden">
        <div className="news-marquee flex whitespace-nowrap py-2 text-[11px] font-medium text-slate-600">
          {[...items, ...items].map((item, i) => (
            <span key={`${item.id}-m-${i}`} className="mx-4 inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-mid shrink-0" />
              <span>{item.title}</span>
              {item.source && <span className="text-brand-mid font-semibold">({item.source})</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Préchargement visuel du suivant (accessibilité screen-reader) */}
      <span className="sr-only">À venir : {next?.title}</span>
    </section>
  );
};
