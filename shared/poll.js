// Enquete de músicas: de 2 a 4 faixas, a pessoa vota numa só, com prazo.
export const ENQUETE_MIN = 2;
export const ENQUETE_MAX = 4;
export const DURACOES_DIAS = [1, 3, 7];

const texto = (valor, max) => (typeof valor === 'string' ? valor.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const linkHttps = (valor, max) => (typeof valor === 'string' && valor.startsWith('https://') && valor.length <= max ? valor : null);

/**
 * Valida a enquete enviada com o post: { enquete: { opcoes, duracaoDias } } ou { erro }.
 * capaValida: no app real, só capas do Deezer (a demo troca pelas capas desenhadas dela).
 */
export function validarEnquete(valor, { capaValida = () => true } = {}) {
  if (!valor || typeof valor !== 'object' || !Array.isArray(valor.opcoes)) return { erro: 'Enquete inválida.' };
  if (valor.opcoes.length < ENQUETE_MIN || valor.opcoes.length > ENQUETE_MAX) {
    return { erro: `A enquete precisa de ${ENQUETE_MIN} a ${ENQUETE_MAX} músicas.` };
  }
  const duracaoDias = Number(valor.duracaoDias ?? 1);
  if (!DURACOES_DIAS.includes(duracaoDias)) return { erro: 'Duração da enquete inválida.' };

  const opcoes = [];
  for (const bruta of valor.opcoes) {
    const titulo = texto(bruta?.titulo, 255);
    // O tamanho da capa (até 500) é conferido por capaValida (capaDoDeezer) no app real.
    const capa = typeof bruta?.capa === 'string' && capaValida(bruta.capa) ? bruta.capa : null;
    if (!titulo || !capa) return { erro: 'Opção da enquete inválida. Escolha a música pela busca.' };
    opcoes.push({ titulo, artista: texto(bruta.artista, 255) || null, capa, preview: linkHttps(bruta.preview, 2000) });
  }
  const repetida = opcoes.some((o, i) => opcoes.findIndex((x) => x.titulo === o.titulo && x.artista === o.artista) !== i);
  if (repetida) return { erro: 'A mesma música aparece duas vezes na enquete.' };
  return { enquete: { opcoes, duracaoDias } };
}

// Porcentagem arredondada de cada opção (0 quando ninguém votou).
export const porcentagem = (votos, total) => (total > 0 ? Math.round((votos / total) * 100) : 0);
