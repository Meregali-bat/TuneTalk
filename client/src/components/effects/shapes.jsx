// Formas desenhadas do efeito do perfil (SVG próprio, sem imagem externa).

// Altura da pauta em cada x: uma onda suave (sobe na primeira metade, desce na segunda).
const onda = (x) => -7 * Math.sin((x / 200) * Math.PI * 2);
const LINHAS = [24, 31, 38, 45, 52];
const linhaPath = (y) => `M0 ${y} C50 ${y - 14} 50 ${y - 14} 100 ${y} S150 ${y + 14} 200 ${y}`;

// Cabeça da nota (elipse inclinada), haste para cima e bandeirola ou barra.
function Colcheia({ x, y, cor }) {
  return (
    <g fill={cor} stroke={cor}>
      <ellipse cx={x} cy={y} rx="5.2" ry="3.8" transform={`rotate(-22 ${x} ${y})`} stroke="none" />
      <path d={`M${x + 4.6} ${y - 1} V${y - 30}`} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d={`M${x + 4.6} ${y - 30} c2 6 10 8 8 17 c-1 -5 -4 -8 -8 -9`} stroke="none" />
    </g>
  );
}

function ColcheiasLigadas({ x, y, cor }) {
  const x2 = x + 18;
  const y2 = y - 5;
  return (
    <g fill={cor} stroke={cor}>
      <ellipse cx={x} cy={y} rx="5.2" ry="3.8" transform={`rotate(-22 ${x} ${y})`} stroke="none" />
      <ellipse cx={x2} cy={y2} rx="5.2" ry="3.8" transform={`rotate(-22 ${x2} ${y2})`} stroke="none" />
      <path d={`M${x + 4.6} ${y - 1} V${y - 28} M${x2 + 4.6} ${y2 - 1} V${y2 - 28}`} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d={`M${x + 3.7} ${y - 28} L${x2 + 5.5} ${y2 - 28} L${x2 + 5.5} ${y2 - 23} L${x + 3.7} ${y - 23} Z`} stroke="none" />
    </g>
  );
}

function Seminima({ x, y, cor }) {
  return (
    <g fill={cor} stroke={cor}>
      <ellipse cx={x} cy={y} rx="5.2" ry="3.8" transform={`rotate(-22 ${x} ${y})`} stroke="none" />
      <path d={`M${x + 4.6} ${y - 1} V${y - 28}`} strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </g>
  );
}

// Clave de sol em traço único, arredondado.
function ClaveDeSol({ x, y, cor }) {
  return (
    <path
      transform={`translate(${x} ${y})`}
      d="M2 30 c-5 1 -7 -4 -3 -6 c3 -1 5 2 3 4 M2 30 L5 -24 c1 -7 7 -6 6 0 c-1 6 -9 12 -13 19 c-5 8 -3 17 6 18 c7 0 10 -7 6 -12 c-4 -4 -11 -1 -10 4"
      fill="none"
      stroke={cor}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

const NOTAS = [Colcheia, ColcheiasLigadas, Seminima];

/**
 * Um pedaço de pauta ondulada (as cinco linhas, cada uma numa cor da paleta) com notas em cima.
 * `variante` escolhe quais notas e onde; o primeiro pedaço de cada três leva a clave de sol.
 */
export function Pauta({ largura, cores, variante = 0 }) {
  const cor = (i) => cores[(variante + i) % cores.length];
  // Notas sobre linhas e espaços diferentes em cada variante; a altura acompanha a onda.
  const posicoes = [[62, 2], [112, 0], [158, 3]].map(([x, linha], i) => ({
    x,
    y: LINHAS[(linha + variante) % LINHAS.length] - 3.5 * ((variante + i) % 2) + onda(x),
    Nota: NOTAS[(variante + i) % NOTAS.length],
  }));
  return (
    <svg className="pauta" width={largura} height={largura * 0.45} viewBox="0 -6 200 90" aria-hidden="true">
      {LINHAS.map((y, i) => (
        <path key={y} d={linhaPath(y)} fill="none" stroke={cor(i)} strokeWidth="2" strokeLinecap="round" opacity=".9" />
      ))}
      {variante % 3 === 0 && <ClaveDeSol x={22} y={32 + onda(22)} cor={cor(0)} />}
      {posicoes.map(({ x, y, Nota }, i) => <Nota key={x} x={x} y={y} cor={cor(i + 1)} />)}
    </svg>
  );
}

// Reflexo de holograma (rosa, ciano, amarelo, lilás) intercalado com as cores da paleta escolhida.
const HOLO = ['#ff9de2', '#9be7ff', '#fff59d', '#c5a3ff'];

// CD holográfico: arco-íris cônico sob um brilho prateado, com o furo no meio.
export function Cd({ tamanho, cores }) {
  const faixas = cores.flatMap((cor, i) => [cor, HOLO[i % HOLO.length]]);
  const arco = [...faixas, faixas[0]].join(', ');
  return (
    <span
      className="cd-holo"
      style={{ width: `${tamanho}px`, height: `${tamanho}px`, '--cd-arco': arco }}
    />
  );
}
