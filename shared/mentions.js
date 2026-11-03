// Marcações no texto: @ seguido de um nome de usuário (3 a 30 letras sem acento, números, ponto e
// underline). Não pega email (letra antes do @) nem o ponto de fim de frase.
const MENCAO = /(^|[^\w@.])@([a-zA-Z0-9._]{3,30})/g;

const limpar = (nome) => nome.replace(/\.+$/, '');

export function extractMentions(texto = '') {
  const nomes = [...texto.matchAll(MENCAO)].map((m) => limpar(m[2]).toLowerCase()).filter((n) => n.length >= 3);
  return [...new Set(nomes)];
}

export function splitMentions(texto = '') {
  const partes = [];
  let resto = 0;
  for (const m of texto.matchAll(MENCAO)) {
    const nome = limpar(m[2]);
    if (nome.length < 3) continue;
    const inicio = m.index + m[1].length;
    if (inicio > resto) partes.push({ tipo: 'texto', valor: texto.slice(resto, inicio) });
    partes.push({ tipo: 'mencao', valor: nome });
    resto = inicio + 1 + nome.length;
  }
  if (resto < texto.length) partes.push({ tipo: 'texto', valor: texto.slice(resto) });
  return partes.length ? partes : [{ tipo: 'texto', valor: texto }];
}
