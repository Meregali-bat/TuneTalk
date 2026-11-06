// Formas desenhadas do efeito do perfil (SVG próprio, sem imagem externa). As notas são
// desenhadas para uma pauta com ~7 unidades entre as linhas e a cabeça em (x, y).

// Cabeça da nota (elipse inclinada), haste para cima e bandeirola ou barra.
export function Colcheia({ x, y, cor }) {
  return (
    <g fill={cor} stroke={cor}>
      <ellipse cx={x} cy={y} rx="5.2" ry="3.8" transform={`rotate(-22 ${x} ${y})`} stroke="none" />
      <path d={`M${x + 4.6} ${y - 1} V${y - 30}`} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d={`M${x + 4.6} ${y - 30} c2 6 10 8 8 17 c-1 -5 -4 -8 -8 -9`} stroke="none" />
    </g>
  );
}

export function ColcheiasLigadas({ x, y, cor }) {
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

export function Seminima({ x, y, cor }) {
  return (
    <g fill={cor} stroke={cor}>
      <ellipse cx={x} cy={y} rx="5.2" ry="3.8" transform={`rotate(-22 ${x} ${y})`} stroke="none" />
      <path d={`M${x + 4.6} ${y - 1} V${y - 28}`} strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </g>
  );
}

// Clave de sol em traço único, arredondado.
export function ClaveDeSol({ x, y, cor }) {
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
