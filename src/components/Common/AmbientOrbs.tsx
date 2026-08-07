import React, { useEffect, useState } from 'react';

interface Orb {
  id: number;
  left: number;
  top: number;
  size: number;
  color: string;
  peak: number;
  duration: number;
  delay: number;
  nonce: number;
}

const ORB_COLORS = [
  'rgba(45, 212, 191, 0.95)',
  'rgba(94, 234, 212, 0.9)',
  'rgba(34, 211, 238, 0.88)',
  'rgba(56, 189, 248, 0.85)',
  'rgba(20, 184, 166, 0.92)',
  'rgba(125, 211, 252, 0.8)',
  'rgba(45, 212, 191, 0.85)',
];

const ORB_COUNT = 8;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Position vraiment aléatoire sur tout l’écran (évite les coins trop groupés). */
function randomPosition(): { left: number; top: number } {
  return {
    left: rand(2, 98),
    top: rand(2, 98),
  };
}

function makeOrb(id: number, delay?: number): Orb {
  const pos = randomPosition();
  return {
    id,
    left: pos.left,
    top: pos.top,
    size: rand(180, 640),
    color: ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)],
    peak: rand(0.62, 0.95),
    duration: rand(22, 48),
    delay: delay ?? rand(0, 14),
    nonce: Math.random(),
  };
}

function createOrbs(): Orb[] {
  return Array.from({ length: ORB_COUNT }, (_, i) => makeOrb(i));
}

export const AmbientOrbs: React.FC = () => {
  const [orbs, setOrbs] = useState<Orb[]>(() => createOrbs());
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  if (reduced) return null;

  return (
    <div className="ambient-orbs" aria-hidden>
      {orbs.map((orb) => (
        <span
          key={`${orb.id}-${orb.nonce}`}
          className="ambient-orb"
          style={
            {
              left: `${orb.left}%`,
              top: `${orb.top}%`,
              width: `${orb.size}px`,
              height: `${orb.size}px`,
              '--orb-color': orb.color,
              '--orb-peak': String(orb.peak),
              animationDuration: `${orb.duration}s`,
              animationDelay: `${orb.delay}s`,
            } as React.CSSProperties
          }
          onAnimationIteration={() => {
            setOrbs((prev) =>
              prev.map((o) => (o.id === orb.id ? makeOrb(orb.id, 0) : o))
            );
          }}
        />
      ))}
    </div>
  );
};
