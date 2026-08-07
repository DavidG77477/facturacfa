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

const LOCAL_IMAGES = [
  '/mali-bamako.jpg',
  '/mali-bamako-2.jpg',
  '/mali-bamako-3.jpg',
  '/mali-bamako-4.jpg',
];

const FALLBACK_NEWS: NewsItem[] = [
  {
    id: 'f1',
    title: 'Astuce FacturaCFA : numérotez vos devis et factures pour un suivi clair en FCFA.',
    source: 'FacturaCFA',
    image: LOCAL_IMAGES[0],
  },
  {
    id: 'f2',
    title: 'Bamako : pensez à indiquer NIF et mentions légales en pied de page de vos documents.',
    source: 'Bonnes pratiques',
    image: LOCAL_IMAGES[1],
  },
  {
    id: 'f3',
    title: 'Conseil : convertissez un devis accepté en facture en un clic pour gagner du temps.',
    source: 'FacturaCFA',
    image: LOCAL_IMAGES[2],
  },
  {
    id: 'f4',
    title: 'Zone UEMOA : le Franc CFA (XOF) reste l’unité de référence pour vos échanges locaux.',
    source: 'Économie',
    image: LOCAL_IMAGES[3],
  },
  {
    id: 'f5',
    title: 'Mali : suivez l’actualité économique et institutionnelle pour anticiper vos devis clients.',
    source: 'Bamako',
    image: LOCAL_IMAGES[0],
  },
  {
    id: 'f6',
    title: 'Kayes, Sikasso, Mopti : adaptez délais de paiement et échéances à vos clients régionaux.',
    source: 'Bonnes pratiques',
    image: LOCAL_IMAGES[1],
  },
];

interface FeedConfig {
  url: string;
  source: string;
  /** Si true, ne garde que les titres clairement liés au Mali */
  requireMaliMention?: boolean;
}

const FEEDS: FeedConfig[] = [
  { url: 'https://www.rfi.fr/fr/tag/mali/rss', source: 'RFI' },
  { url: 'https://www.france24.com/fr/tag/mali/rss', source: 'France 24' },
  { url: 'https://www.studiotamani.org/rss', source: 'Studio Tamani' },
  { url: 'https://malijet.com/rss.xml', source: 'Malijet' },
  { url: 'https://www.lemonde.fr/mali/rss_full.xml', source: 'Le Monde' },
  {
    url: 'https://news.google.com/rss/search?q=Mali+when:14d&hl=fr&gl=ML&ceid=ML:fr',
    source: 'Google News',
  },
  {
    url: 'https://feeds.bbci.co.uk/afrique/rss.xml',
    source: 'BBC Afrique',
    requireMaliMention: true,
  },
];

const MALI_MENTION_RE =
  /\b(mali|malienn?e?s?|bamako|s[ée]gou|tombouctou|timbuktu|gao|kidal|mopti|sikasso|kayes|koulikoro|sahel|azawad|fcfa|uemoa|aes)\b/i;

const ROTATE_MS = 10000; // changement toutes les 10 s
const FADE_MS_CLASS = 'duration-[1800ms]';
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_ITEMS = 28;
const NEWS_TZ = 'Africa/Bamako';
const CACHE_KEY = 'facturacfa_news_daily_v2';

interface NewsCache {
  dayKey: string;
  items: NewsItem[];
  fetchedAt: string;
}

function todayKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: NEWS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function readNewsCache(): NewsCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NewsCache;
    if (!parsed?.dayKey || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeNewsCache(items: NewsItem[]): void {
  try {
    const payload: NewsCache = {
      dayKey: todayKey(),
      items,
      fetchedAt: new Date().toISOString(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

/** ms until next midnight in Africa/Bamako (+ 2s buffer) */
function msUntilNextBamakoMidnight(): number {
  const now = Date.now();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: NEWS_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(now));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  const h = get('hour');
  const m = get('minute');
  const s = get('second');
  const elapsed = ((h * 60 + m) * 60 + s) * 1000;
  const dayMs = 24 * 60 * 60 * 1000;
  return dayMs - elapsed + 2000;
}

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

function isRecentEnough(dateStr?: string): boolean {
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

function looksLikeMaliNews(title: string, description?: string): boolean {
  const hay = `${title} ${description || ''}`;
  return MALI_MENTION_RE.test(hay);
}

function fallbackImage(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return LOCAL_IMAGES[h % LOCAL_IMAGES.length];
}

async function fetchFeed(feed: FeedConfig): Promise<NewsItem[]> {
  const res = await fetch(rss2jsonUrl(feed.url));
  if (!res.ok) throw new Error('rss');
  const data = await res.json();
  if (data.status !== 'ok' || !Array.isArray(data.items)) return [];

  const out: NewsItem[] = [];
  data.items.forEach((it: any, i: number) => {
    if (!isRecentEnough(it.pubDate)) return;
    const title = String(it.title || 'Actualité').replace(/\s+/g, ' ').trim();
    const description = String(it.description || '');
    if (feed.requireMaliMention && !looksLikeMaliNews(title, description)) return;
    out.push({
      id: String(it.guid || it.link || `${feed.source}-${i}`),
      title,
      source: feed.source,
      link: it.link,
      pubDate: it.pubDate,
      image: extractImage(it) || fallbackImage(title),
    });
  });
  return out;
}

export const NewsCard: React.FC = () => {
  const [items, setItems] = useState<NewsItem[]>(() => {
    const cached = readNewsCache();
    if (cached?.dayKey === todayKey() && cached.items.length) return cached.items;
    return FALLBACK_NEWS;
  });
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(() => {
    const cached = readNewsCache();
    return Boolean(cached?.dayKey === todayKey() && cached.items.length);
  });
  const [imgBroken, setImgBroken] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let midnightTimer: number | undefined;

    const applyItems = (next: NewsItem[], isLive: boolean) => {
      setItems(next);
      setLive(isLive);
      setIndex(0);
      setImgBroken(false);
      if (isLive && next.length) writeNewsCache(next);
    };

    const fetchFresh = async () => {
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

        const next = merged.slice(0, MAX_ITEMS);
        if (next.length) {
          applyItems(next, true);
        } else {
          const cached = readNewsCache();
          if (cached?.items.length) {
            applyItems(cached.items, true);
          } else {
            applyItems(FALLBACK_NEWS, false);
          }
        }
      } catch {
        if (cancelled) return;
        const cached = readNewsCache();
        if (cached?.items.length) {
          applyItems(cached.items, true);
        } else {
          applyItems(FALLBACK_NEWS, false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const loadForToday = async (force = false) => {
      const day = todayKey();
      const cached = readNewsCache();
      if (!force && cached?.dayKey === day && cached.items.length) {
        applyItems(cached.items, true);
        setLoading(false);
        return;
      }
      setLoading(true);
      await fetchFresh();
    };

    const scheduleMidnightRefresh = () => {
      if (midnightTimer) window.clearTimeout(midnightTimer);
      midnightTimer = window.setTimeout(() => {
        void loadForToday(true).then(scheduleMidnightRefresh);
      }, msUntilNextBamakoMidnight());
    };

    void loadForToday(false);
    scheduleMidnightRefresh();

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const cached = readNewsCache();
      if (!cached || cached.dayKey !== todayKey()) {
        void loadForToday(true);
      }
      scheduleMidnightRefresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      if (midnightTimer) window.clearTimeout(midnightTimer);
      document.removeEventListener('visibilitychange', onVisible);
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
      {/* Fond photo — flou léger pour rester lisible */}
      {bgImage && (
        <div
          aria-hidden
          className={`absolute inset-0 z-0 scale-105 opacity-50 blur-[2px] transition-opacity ${FADE_MS_CLASS}`}
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-gradient-to-br from-[#0f2a28]/55 via-[#13201e]/40 to-brand-mid/20"
      />

      <div className="news-glass-inner">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 pb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-10 h-10 rounded-2xl bg-white/40 border border-white/50 backdrop-blur-md flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
              <Newspaper className="w-4 h-4 text-brand-glow" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand-glow shadow-[0_0_10px_rgba(45,212,191,0.7)] animate-pulse" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-extrabold text-[15px] tracking-tight text-brand-sand truncate">
                Actualité Mali
              </h3>
              <p className="text-[10px] text-brand-sand/55 flex items-center gap-1 mt-0.5">
                <Radio className="w-3 h-3 text-brand-mid" />
                {loading
                  ? 'Chargement…'
                  : live
                    ? `${items.length} titres · 14 j · RFI, Tamani, Malijet…`
                    : 'Infos & conseils'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="news-glass-chip">
              <Sparkles className="w-3 h-3 text-brand-mid" />
              Live
            </span>
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 rounded-full bg-white/25 border border-white/40 backdrop-blur-md">
              {items.slice(0, 8).map((_, i) => (
                <span
                  key={i}
                  className={`news-glass-dot ${
                    i === index % Math.min(items.length, 8) ? 'is-active' : ''
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
                className={`flex gap-3 sm:gap-4 transition-all ${FADE_MS_CLASS} ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  active
                    ? 'relative opacity-100 translate-y-0 scale-100'
                    : 'absolute inset-x-3 sm:inset-x-4 top-3 bottom-3 opacity-0 translate-y-2 scale-[0.99] pointer-events-none'
                }`}
                aria-hidden={!active}
              >
                <div className="news-glass-media relative w-[118px] sm:w-[148px] h-[92px] sm:h-[108px] shrink-0 bg-brand-mist/60">
                  {item.image && !(active && imgBroken) ? (
                    <img
                      src={item.image}
                      alt=""
                      className={`w-full h-full object-cover transition-transform ${FADE_MS_CLASS} group-hover/news:scale-105`}
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
                  <p className="text-sm sm:text-[15px] font-semibold text-brand-sand min-h-[2.7rem] leading-snug line-clamp-2 drop-shadow-sm">
                    {item.title}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-brand-sand/50">
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
          <div className="news-marquee flex whitespace-nowrap py-2.5 text-[11px] font-medium text-brand-sand/70">
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
                  <span className="text-brand-mid font-semibold">
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
