import { useEffect, useState } from 'react';
import { EFEITO_PALETAS } from '../../../../shared/profileEffect.js';

// Roxo, lilás e rosa, na linha das pétalas da Olivia Rodrigo.
const COLORS = EFEITO_PALETAS.lilas.cores;

// Formas além da pétala: caracteres de texto (o \uFE0E impede o coração de virar emoji no iPhone).
const GLIFOS = {
  notas: ['\u266A', '\u266B'],
  estrelas: ['\u2605'],
  coracoes: ['\u2665\uFE0E'],
};

const between = (random, min, max) => min + random() * (max - min);

export function makePetals(count, random = Math.random, colors = COLORS) {
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
    color: colors[Math.floor(random() * colors.length) % colors.length],
  }));
}

/**
 * Pétalas (ou notas, estrelas, corações) caindo uma vez pela tela. Só CSS (transform e opacity),
 * então roda fora da thread principal; quando a última termina, a camada sai da página.
 */
export function PetalRain({ count = 26, random = Math.random, tipo = 'petalas', colors = COLORS }) {
  const [petals] = useState(() => makePetals(count, random, colors));
  const glifos = GLIFOS[tipo];
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const total = Math.max(...petals.map((p) => p.delay + p.duration));
    const timer = setTimeout(() => setVisible(false), total * 1000 + 150);
    return () => clearTimeout(timer);
  }, [petals]);

  if (!visible) return null;

  return (
    <div className="petal-rain" aria-hidden="true" data-testid="petalas" data-tipo={tipo}>
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
          {glifos ? (
            <span
              className="petal__body petal__body--glifo"
              style={{ fontSize: `${p.size * 1.4}px`, '--petal-color': p.color }}
            >
              {glifos[p.id % glifos.length]}
            </span>
          ) : (
            <span
              className="petal__body"
              style={{ width: `${p.size}px`, height: `${p.size * 1.25}px`, '--petal-color': p.color }}
            />
          )}
        </span>
      ))}
    </div>
  );
}

// O efeito que a pessoa ganhou aos 100 posts, com a forma e a paleta que ela escolheu.
export function ProfileEffect({ efeito, ...props }) {
  const paleta = EFEITO_PALETAS[efeito.paleta] ?? EFEITO_PALETAS.lilas;
  return <PetalRain tipo={efeito.tipo} colors={paleta.cores} {...props} />;
}
