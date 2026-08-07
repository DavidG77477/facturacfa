import React, { useEffect, useState } from 'react';
import { Cloud, CloudRain, CloudSun, MapPin, Sun, CloudFog, CloudLightning, Snowflake, Wind } from 'lucide-react';

const BAMAKO_TZ = 'Africa/Bamako';
const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=12.6392&longitude=-8.0029&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Africa%2FBamako';

const BAMAKO_SLIDES = [
  '/mali-bamako.jpg',
  '/mali-bamako-2.jpg',
  '/mali-bamako-3.jpg',
  '/mali-bamako-4.jpg',
] as const;

const SLIDE_INTERVAL_MS = 5500;

interface WeatherState {
  temp: number;
  humidity: number;
  wind: number;
  code: number;
}

interface BamakoWelcomeProps {
  userName?: string;
}

function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Bonjour';
  if (hour >= 12 && hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function weatherLabel(code: number): string {
  if (code === 0) return 'Ciel dégagé';
  if (code <= 3) return 'Partiellement nuageux';
  if (code <= 48) return 'Brume / brouillard';
  if (code <= 57) return 'Bruine';
  if (code <= 67) return 'Pluie';
  if (code <= 77) return 'Neige';
  if (code <= 82) return 'Averses';
  if (code <= 86) return 'Averses de neige';
  if (code <= 99) return 'Orage';
  return 'Météo locale';
}

function WeatherIcon({ code, className }: { code: number; className?: string }) {
  if (code === 0) return <Sun className={className} />;
  if (code <= 3) return <CloudSun className={className} />;
  if (code <= 48) return <CloudFog className={className} />;
  if (code <= 67 || (code >= 80 && code <= 82)) return <CloudRain className={className} />;
  if (code <= 77 || (code >= 85 && code <= 86)) return <Snowflake className={className} />;
  if (code >= 95) return <CloudLightning className={className} />;
  return <Cloud className={className} />;
}

function formatBamakoNow(date: Date) {
  const time = new Intl.DateTimeFormat('fr-FR', {
    timeZone: BAMAKO_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);

  const day = new Intl.DateTimeFormat('fr-FR', {
    timeZone: BAMAKO_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: BAMAKO_TZ,
      hour: 'numeric',
      hour12: false,
    }).format(date)
  );

  return { time, day, hour };
}

export const BamakoWelcome: React.FC<BamakoWelcomeProps> = ({ userName }) => {
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSlideIndex((i) => (i + 1) % BAMAKO_SLIDES.length);
    }, SLIDE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    BAMAKO_SLIDES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(WEATHER_URL);
        if (!res.ok) throw new Error('weather');
        const data = await res.json();
        if (cancelled) return;
        setWeather({
          temp: data.current.temperature_2m,
          humidity: data.current.relative_humidity_2m,
          wind: data.current.wind_speed_10m,
          code: data.current.weather_code,
        });
        setWeatherError(false);
      } catch {
        if (!cancelled) setWeatherError(true);
      }
    };

    void load();
    const refresh = window.setInterval(load, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
    };
  }, []);

  const { time, day, hour } = formatBamakoNow(now);
  const greeting = greetingForHour(hour);
  const firstName = userName?.trim().split(/\s+/)[0];

  return (
    <section
      data-bamako-welcome
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl min-h-[200px] sm:min-h-[220px] border border-brand-ink/10 shadow-sm"
    >
      {BAMAKO_SLIDES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden
          className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-[1400ms] ease-in-out ${
            i === slideIndex ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      {/* Couche opaque pour lisibilité */}
      <div
        aria-hidden
        className="absolute inset-0 z-[1]"
        style={{
          background:
            'linear-gradient(120deg, rgba(6,46,44,0.88) 0%, rgba(10,61,58,0.78) 45%, rgba(6,46,44,0.72) 100%)',
        }}
      />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 p-5 sm:p-7 text-brand-paper">
        <div className="space-y-2 min-w-0">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-glow/90">
            <MapPin className="w-3.5 h-3.5" />
            <span>Bamako, Mali</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            {greeting}
            {firstName ? `, ${firstName}` : ''}
          </h2>
          <p className="text-sm text-brand-sand/80 capitalize">{day}</p>
        </div>

        <div className="flex flex-wrap items-stretch gap-3 sm:gap-4">
          <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm px-4 py-3 min-w-[140px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-sand/70 mb-1">Heure locale</p>
            <p className="kpi-figure text-2xl sm:text-3xl text-brand-paper tabular-nums leading-none">{time}</p>
            <p className="text-[11px] text-brand-sand/65 mt-1.5">GMT · Africa/Bamako</p>
          </div>

          <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm px-4 py-3 min-w-[160px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-sand/70 mb-1">Météo</p>
            {weather ? (
              <>
                <div className="flex items-center gap-2">
                  <WeatherIcon code={weather.code} className="w-6 h-6 text-brand-glow shrink-0" />
                  <p className="kpi-figure text-2xl sm:text-3xl text-brand-paper leading-none">
                    {Math.round(weather.temp)}°C
                  </p>
                </div>
                <p className="text-[11px] text-brand-sand/80 mt-1.5">{weatherLabel(weather.code)}</p>
                <p className="text-[10px] text-brand-sand/55 mt-0.5 flex items-center gap-1">
                  <Wind className="w-3 h-3" />
                  {Math.round(weather.wind)} km/h · Hum. {weather.humidity}%
                </p>
              </>
            ) : (
              <p className="text-sm text-brand-sand/70 mt-1">
                {weatherError ? 'Météo indisponible' : 'Chargement…'}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
