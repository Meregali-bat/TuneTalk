// Nota de 0 a 10: cada ponto é meia estrela (10 = 5 estrelas).
export const NOTA_MAX = 10;

export function parseNota(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return Number.NaN;
  return Number(value);
}

export const isValidNota = (nota) => Number.isInteger(nota) && nota >= 0 && nota <= NOTA_MAX;

const LABELS = [
  [0, 'Péssimo'], [2, 'Ruim'], [4, 'Fraco'], [5, 'Ok'], [6, 'Bom'], [8, 'Muito bom'], [9, 'Excelente'], [10, 'Obra-prima'],
];

// Descrição curta da nota para mostrar junto das estrelas.
export function notaLabel(nota) {
  return LABELS.filter(([min]) => nota >= min).at(-1)[1];
}
