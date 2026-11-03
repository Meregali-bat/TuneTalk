// Regras do trecho da letra, usadas no servidor (validação) e no navegador (escolha dos versos).
export const MAX_VERSOS = 4;
export const VERSO_MAX = 150;

const limpar = (verso) => String(verso).replace(/\s+/g, ' ').trim();

/**
 * Transforma a letra (texto puro) na lista de versos: sem linhas vazias nem marcações como "[Refrão]".
 * Tolera qualquer entrada (devolve [] para o que não for texto).
 */
export function versosDaLetra(letra, maxLinhas = 400) {
  if (typeof letra !== 'string') return [];
  return letra
    .split(/\r?\n/)
    .map(limpar)
    .filter((verso) => verso && !/^\[.*\]$/.test(verso))
    .map((verso) => verso.slice(0, VERSO_MAX))
    .slice(0, maxLinhas);
}

/**
 * Valida o trecho enviado com o post. Devolve { versos } (null quando não há trecho) ou { erro }.
 */
export function validarTrecho(valor) {
  if (valor === undefined || valor === null) return { versos: null };
  if (!Array.isArray(valor) || valor.some((v) => typeof v !== 'string')) return { erro: 'Trecho da letra inválido.' };
  const versos = valor.map(limpar);
  if (versos.length === 0) return { versos: null };
  if (versos.length > MAX_VERSOS) return { erro: `Escolha no máximo ${MAX_VERSOS} versos da letra.` };
  if (versos.some((v) => !v || v.length > VERSO_MAX)) return { erro: 'Trecho da letra inválido.' };
  return { versos };
}

/**
 * Escolha de versos seguidos: tocar ao lado do trecho aumenta, tocar na ponta tira,
 * tocar longe (ou no meio) começa de novo. Devolve { inicio, fim } (ou null) e se bateu no limite.
 */
export function alternarVerso(selecao, indice, max = MAX_VERSOS) {
  if (!selecao) return { selecao: { inicio: indice, fim: indice } };
  const { inicio, fim } = selecao;
  if (indice === inicio && indice === fim) return { selecao: null };
  if (indice === inicio) return { selecao: { inicio: inicio + 1, fim } };
  if (indice === fim) return { selecao: { inicio, fim: fim - 1 } };
  const encosta = indice === inicio - 1 || indice === fim + 1;
  if (encosta) {
    if (fim - inicio + 1 >= max) return { selecao, limite: true };
    return { selecao: { inicio: Math.min(inicio, indice), fim: Math.max(fim, indice) } };
  }
  return { selecao: { inicio: indice, fim: indice } };
}
