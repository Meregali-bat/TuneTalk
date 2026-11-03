import { useEffect, useState } from 'react';

// Roxo, lilás e rosa, na linha das pétalas da Olivia Rodrigo.
const COLORS = ['#b388ff', '#9b5de5', '#d7b8ff', '#f4a6c8', '#e879b9', '#c084fc'];

const between = (random, min, max) => min + random() * (max - min);

export function makePetals(count, random = Math.random) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: between(random, 0, 100),
    y: between(random, 5, 80),
    size: between(random, 10, 22),
    delay: between(random, 0, 2.5),
    duration: between(random, 4.5, 7.5),
    sway: between(random, 20, 60),
    swayDuration: between(random, 1.6, 3),
    spin: between(random, 90, 360),
    color: COLORS[Math.floor(random() * COLORS.length) % COLORS.length],
  }));
}

/**
 * Pétalas caindo uma vez pela tela. Só CSS (transform e opacity), então roda fora da thread
 * principal; quando a última pétala termina, a camada sai da página.
 */
export function PetalRain({ count = 26, random = Math.random }) {
  const [petals] = useState(() => makePetals(count, random));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const total = Math.max(...petals.map((p) => p.delay + p.duration));
    const timer = setTimeout(() => setVisible(false), total * 1000 + 150);
    return () => clearTimeout(timer);
  }, [petals]);

  if (!visible) return null;

  return (
    <div className="petal-rain" aria-hidden="true" data-testid="petalas">
      {petals.map((p) => (
        <span
          key={p.id}
          className="petal"
          style={{
            left: `${p.x}%`,
            '--y': `${p.y}vh`,
            '--delay': `${p.delay}s`,
            '--dur': `${p.duration}s`,
            '--sway': `${p.sway}px`,
            '--sway-dur': `${p.swayDuration}s`,
            '--spin': `${p.spin}deg`,
          }}
        >
          <span
            className="petal__body"
            style={{ width: `${p.size}px`, height: `${p.size * 1.25}px`, '--petal-color': p.color }}
          />
        </span>
      ))}
    </div>
  );
}
