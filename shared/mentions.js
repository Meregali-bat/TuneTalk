// Marcações e hashtags no texto.
// @usuario: 3 a 30 letras sem acento, números, ponto e underline; não pega email nem o ponto final.
// #hashtag: 2 a 50 letras (com acento), números ou underline.
const MENCAO = /(^|[^\w@.])@([a-zA-Z0-9._]{3,30})/g;
const HASHTAG = /(^|[^\p{L}\p{N}_&#])#([\p{L}\p{N}_]{2,50})/gu;

const limpar = (nome) => nome.replace(/\.+$/, '');

export function extractMentions(texto = '') {
  const nomes = [...texto.matchAll(MENCAO)].map((m) => limpar(m[2]).toLowerCase()).filter((n) => n.length >= 3);
  return [...new Set(nomes)];
}

export function extractHashtags(texto = '') {
  return [...new Set([...texto.matchAll(HASHTAG)].map((m) => m[2].toLowerCase()))];
}

export const hasHashtag = (texto, tag) => extractHashtags(texto).includes(tag.toLowerCase());

// Pedaços do texto em ordem: { tipo: 'texto' | 'mencao' | 'hashtag', valor }.
export function splitMentions(texto = '') {
  const achados = [
    ...[...texto.matchAll(MENCAO)].map((m) => ({ m, tipo: 'mencao', valor: limpar(m[2]) })).filter((a) => a.valor.length >= 3),
    ...[...texto.matchAll(HASHTAG)].map((m) => ({ m, tipo: 'hashtag', valor: m[2] })),
  ].sort((a, b) => a.m.index - b.m.index);

  const partes = [];
  let resto = 0;
  for (const { m, tipo, valor } of achados) {
    const inicio = m.index + m[1].length;
    if (inicio < resto) continue;
    if (inicio > resto) partes.push({ tipo: 'texto', valor: texto.slice(resto, inicio) });
    partes.push({ tipo, valor });
    resto = inicio + 1 + valor.length;
  }
  if (resto < texto.length) partes.push({ tipo: 'texto', valor: texto.slice(resto) });
  return partes.length ? partes : [{ tipo: 'texto', valor: texto }];
}
