import React, { useEffect, useState } from 'react';
import { ExternalLink, ImageOff, Newspaper, Radio, Sparkles } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  source?: string;
  link?: string;
  pubDate?: string;
  image?: string;
}

const FALLBACK_NEWS: NewsItem[] = [
  {
    id: 'f1',
    title: 'Astuce FacturaCFA : numérotez vos devis et factures pour un suivi clair en FCFA.',
    source: 'FacturaCFA',
    image: '/mali-bamako.jpg',
  },
  {
    id: 'f2',
    title: 'Bamako : pensez à indiquer NIF et mentions légales en pied de page de vos documents.',
    source: 'Bonnes pratiques',
    image: '/mali-bamako-2.jpg',
  },
  {
    id: 'f3',
    title: 'Conseil : convertissez un devis accepté en facture en un clic pour gagner du temps.',
    source: 'FacturaCFA',
    image: '/mali-bamako-3.jpg',
  },
  {
    id: 'f4',
    title: 'Zone UEMOA : le Franc CFA (XOF) reste l’unité de référence pour vos échanges locaux.',
    source: 'Économie',
    image: '/mali-bamako-4.jpg',
  },
];

const FEEDS: { url: string; source: string }[] = [
  { url: 'https://www.rfi.fr/fr/tag/mali/rss', source: 'RFI' },
  { url: 'https://www.france24.com/fr/tag/mali/rss', source: 'France 24' },
];

const ROTATE_MS = 5000;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function rss2jsonUrl(rss: string): string {
  return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rss)}`;
}

function extractImage(it: any): string | undefined {
  const fromDesc =
    typeof it.description === 'string'
      ? Array.from(it.description.matchAll(/src=["']([^"']+)["']/gi)).map(
          (m: RegExpMatchArray) => m[1]
        )
      : [];

  const candidates = [
    it.thumbnail,
    it.enclosure?.link,
    it.enclosure?.thumbnail,
    ...fromDesc,
  ].filter(Boolean) as string[];

  return candidates.find((u) => /^https?:\/\//i.test(u) && !u.includes('1x1'));
}

function isWithinLast7Days(dateStr?: string): boolean {
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return false;
  const age = Date.now() - t;
  return age >= 0 && age <= MAX_AGE_MS;
}

function formatRelative(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const diffH = Math.round(diffMs / 36e5);
  if (diffH < 1) return 'À l’instant';
  if (diffH < 24) return `Aujourd’hui · il y a ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD <= 1) return 'Hier';
  return `Il y a ${diffD} j`;
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, ' ').trim();
}

async function fetchFeed(feed: { url: string; source: string }): Promise<NewsItem[]> {
  const res = await fetch(rss2jsonUrl(feed.url));
  if (!res.ok) throw new Error('rss');
  const data = await res.json();
  if (data.status !== 'ok' || !Array.isArray(data.items)) return [];

  return data.items
    .filter((it: any) => isWithinLast7Days(it.pubDate))
    .map((it: any, i: number) => {
      const title = String(it.title || 'Actualité').replace(/\s+/g, ' ').trim();
      return {
        id: String(it.guid || it.link || `${feed.source}-${i}`),
        title,
        source: feed.source,
        link: it.link,
        pubDate: it.pubDate,
        image: extractImage(it),
      } satisfies NewsItem;
    })
    .filter((it: NewsItem) => Boolean(it.image));
}

export const NewsCard: React.FC = () => {
  const [items, setItems] = useState<NewsItem[]>(FALLBACK_NEWS);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [imgBroken, setImgBroken] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const results = await Promise.allSettled(FEEDS.map(fetchFeed));
        if (cancelled) return;

        const merged: NewsItem[] = [];
        const seen = new Set<string>();

        for (const result of results) {
          if (result.status !== 'fulfilled') continue;
          for (const item of result.value) {
            const key = normalizeTitle(item.title);
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(item);
          }
        }

        merged.sort(
          (a, b) => new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime()
        );

        const next = merged.slice(0, 12);
        setItems(next.length ? next : FALLBACK_NEWS);
        setLive(next.length > 0);
        setIndex(0);
        setImgBroken(false);
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
      setImgBroken(false);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [items.length]);

  const current = items[index] || items[0];
  const next = items[(index + 1) % Math.max(items.length, 1)];
  const bgImage = current?.image && !imgBroken ? current.image : undefined;

  return (
    <section className="news-glass hover-lift group/news">
      {/* Fond photo flou pour profondeur verre */}
      {bgImage && (
        <div
          aria-hidden
          className="absolute inset-0 z-0 scale-110 opacity-35 blur-2xl transition-opacity duration-700"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-gradient-to-br from-white/50 via-brand-mist/30 to-brand-mid/10 dark:from-[#13201e]/50 dark:via-transparent dark:to-brand-glow/5"
      />

      <div className="news-glass-inner">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 pb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-10 h-10 rounded-2xl bg-white/40 dark:bg-white/10 border border-white/50 dark:border-white/15 backdrop-blur-md flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
              <Newspaper className="w-4 h-4 text-brand-ink dark:text-brand-glow" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand-glow shadow-[0_0_10px_rgba(45,212,191,0.7)] animate-pulse" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-extrabold text-[15px] tracking-tight text-brand-ink dark:text-brand-sand truncate">
                Actualité Mali
              </h3>
              <p className="text-[10px] text-slate-600/80 dark:text-brand-sand/55 flex items-center gap-1 mt-0.5">
                <Radio className="w-3 h-3 text-brand-mid" />
                {loading ? 'Chargement…' : live ? 'Fil photo · 7 derniers jours' : 'Infos & conseils'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="news-glass-chip">
              <Sparkles className="w-3 h-3 text-brand-mid" />
              Live
            </span>
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 rounded-full bg-white/25 dark:bg-white/5 border border-white/40 dark:border-white/10 backdrop-blur-md">
              {items.slice(0, 6).map((_, i) => (
                <span
                  key={i}
                  className={`news-glass-dot ${
                    i === index % Math.min(items.length, 6) ? 'is-active' : ''
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="relative min-h-[136px] sm:min-h-[128px] px-3 sm:px-4 py-3">
          {items.map((item, i) => {
            const active = i === index;
            return (
              <div
                key={item.id}
                className={`flex gap-3 sm:gap-4 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  active
                    ? 'relative opacity-100 translate-y-0 scale-100'
                    : 'absolute inset-x-3 sm:inset-x-4 top-3 bottom-3 opacity-0 translate-y-4 scale-[0.98] pointer-events-none'
                }`}
                aria-hidden={!active}
              >
                <div className="news-glass-media relative w-[118px] sm:w-[148px] h-[92px] sm:h-[108px] shrink-0 bg-brand-mist/60">
                  {item.image && !(active && imgBroken) ? (
                    <img
                      src={item.image}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-700 group-hover/news:scale-105"
                      loading={active ? 'eager' : 'lazy'}
                      referrerPolicy="no-referrer"
                      onError={() => {
                        if (active) setImgBroken(true);
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 bg-white/30">
                      <ImageOff className="w-5 h-5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 flex flex-col justify-center py-0.5">
                  {item.source && (
                    <span className="news-glass-chip w-fit mb-2">
                      {item.source}
                    </span>
                  )}
                  <p className="text-sm sm:text-[15px] font-semibold text-slate-800 dark:text-brand-sand min-h-[2.7rem] leading-snug line-clamp-2 drop-shadow-sm">
                    {item.title}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600/80 dark:text-brand-sand/50">
                    {item.pubDate && <span>{formatRelative(item.pubDate)}</span>}
                  </div>
                  {item.link && active && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="news-glass-link hover-press mt-3 w-fit"
                    >
                      Lire l’article
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="news-glass-marquee overflow-hidden">
          <div className="news-marquee flex whitespace-nowrap py-2.5 text-[11px] font-medium text-slate-700/85 dark:text-brand-sand/70">
            {[...items, ...items].map((item, i) => (
              <span key={`${item.id}-m-${i}`} className="mx-4 inline-flex items-center gap-2">
                {item.image ? (
                  <img
                    src={item.image}
                    alt=""
                    className="w-6 h-6 rounded-lg object-cover shrink-0 ring-1 ring-white/50 shadow-sm"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-glow shrink-0 shadow-[0_0_8px_rgba(45,212,191,0.6)]" />
                )}
                <span>{item.title}</span>
                {item.source && (
                  <span className="text-brand-mid dark:text-brand-glow font-semibold">
                    · {item.source}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      <span className="sr-only">
        Actu en cours : {current?.title}. À venir : {next?.title}
      </span>
    </section>
  );
};
