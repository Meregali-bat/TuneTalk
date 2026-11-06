import { useEffect, useState } from 'react';
import { ClaveDeSol, Colcheia, ColcheiasLigadas, Seminima } from './shapes.jsx';

// Caminho da pauta, em frações da tela: entra grande pelo canto de baixo à esquerda, atravessa
// para a direita, sobe fazendo a curva e sai fina pela borda de cima (só a tela corta a pauta).
// Duas curvas de Bézier cúbicas.
const CURVAS = [
  [[-0.08, 0.88], [0.55, 1.08], [1.2, 0.62], [0.82, 0.36]],
  [[0.82, 0.36], [0.5, 0.12], [0.12, 0.26], [0.36, -0.06]],
];
const SEGMENTOS = 40; // por curva
const DESENHO_S = 2.4; // tempo para a pauta atravessar a tela
const SAIDA_S = 1.1; // depois de desenhada, some devagar
const NOTAS = [
  { t: 0.04, Forma: ClaveDeSol, linha: 2 },
  { t: 0.16, Forma: Colcheia, linha: 1 },
  { t: 0.27, Forma: ColcheiasLigadas, linha: 3 },
  { t: 0.39, Forma: Seminima, linha: 2 },
  { t: 0.5, Forma: Colcheia, linha: 4 },
  { t: 0.61, Forma: ColcheiasLigadas, linha: 1 },
  { t: 0.72, Forma: Seminima, linha: 3 },
  { t: 0.83, Forma: Colcheia, linha: 2 },
];

const bezier = ([p0, p1, p2, p3], u) => {
  const v = 1 - u;
  return [0, 1].map((i) => v * v * v * p0[i] + 3 * v * v * u * p1[i] + 3 * v * u * u * p2[i] + u * u * u * p3[i]);
};

// Ponto da pauta em t (0 a 1 ao longo das duas curvas), já em pixels.
function ponto(t, w, h) {
  const total = t * CURVAS.length;
  const i = Math.min(CURVAS.length - 1, Math.floor(total));
  const [x, y] = bezier(CURVAS[i], total - i);
  return [x * w, y * h];
}

/**
 * Monta a pauta: cinco linhas paralelas que vão afinando (traço e espaçamento diminuem de t=0
 * a t=1), cortadas em segmentos para cada um aparecer na sua hora, e as notas ao longo dela.
 */
export function montarPauta(w, h) {
  const base = Math.min(w, h);
  const espaco = base * 0.032;
  const traco = base * 0.007;
  const n = SEGMENTOS * CURVAS.length;
  const amostras = Array.from({ length: n + 1 }, (_, k) => {
    const t = k / n;
    const [x, y] = ponto(t, w, h);
    const [xa, ya] = ponto(Math.max(0, t - 0.002), w, h);
    const [xb, yb] = ponto(Math.min(1, t + 0.002), w, h);
    const ang = Math.atan2(yb - ya, xb - xa);
    return { t, x, y, ang, afina: 1 - 0.88 * t };
  });
  const naLinha = ({ x, y, ang, afina }, linha) => {
    const d = (linha - 2) * espaco * afina;
    return [x - Math.sin(ang) * d, y + Math.cos(ang) * d];
  };

  const segmentos = [];
  for (let k = 0; k < n; k += 1) {
    const a = amostras[k];
    const b = amostras[k + 1];
    for (let linha = 0; linha < 5; linha += 1) {
      const [x1, y1] = naLinha(a, linha);
      const [x2, y2] = naLinha(b, linha);
      segmentos.push({ linha, t: a.t, d: `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`, largura: traco * a.afina });
    }
  }

  const notas = NOTAS.map(({ t, Forma, linha }) => {
    const amostra = amostras[Math.round(t * n)];
    const [x, y] = naLinha(amostra, linha);
    // As formas foram desenhadas para um espaço de ~7 unidades entre linhas.
    const escala = (espaco * amostra.afina) / 7;
    // Em pé, mesmo onde a pauta faz a curva: nota deitada não parece nota.
    return { t, Forma, x, y, escala };
  });

  return { segmentos, notas };
}

/** Uma pauta só que se desenha pela tela, afinando até acabar, e depois some. */
export function StaffSweep({ cores }) {
  const [tela] = useState(() => ({ w: window.innerWidth || 390, h: window.innerHeight || 844 }));
  const [pauta] = useState(() => montarPauta(tela.w, tela.h));
  const [visivel, setVisivel] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisivel(false), (DESENHO_S + SAIDA_S + 1.2) * 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!visivel) return null;

  return (
    <div className="petal-rain staff-sweep" aria-hidden="true" data-testid="petalas" data-tipo="notas">
      <svg width={tela.w} height={tela.h} viewBox={`0 0 ${tela.w} ${tela.h}`} style={{ '--saida': `${DESENHO_S + 0.6}s` }}>
        {pauta.segmentos.map(({ d, linha, t, largura }, i) => (
          <path
            key={i}
            d={d}
            className="staff-sweep__linha"
            stroke={cores[linha % cores.length]}
            strokeWidth={largura.toFixed(2)}
            style={{ animationDelay: `${(t * DESENHO_S).toFixed(3)}s` }}
          />
        ))}
        {pauta.notas.map(({ t, Forma, x, y, escala }, i) => (
          <g key={t} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${escala.toFixed(3)})`}>
            <g className="staff-sweep__nota" style={{ animationDelay: `${(t * DESENHO_S + 0.1).toFixed(3)}s` }}>
              <Forma x={0} y={0} cor={cores[(i + 1) % cores.length]} />
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
