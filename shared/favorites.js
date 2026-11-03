// Favoritos do perfil (como os 4 filmes do Letterboxd): até 5 músicas, 5 álbuns e 5 artistas.
export const FAVORITOS_MAX = 5;
export const TIPOS_FAVORITO = ['musicas', 'albuns', 'artistas'];
const TEXTO_MAX = 200;
const URL_MAX = 500;

export const favoritosVazios = () => ({ musicas: [], albuns: [], artistas: [] });

// Capas e fotos vêm do Deezer: só aceitamos imagens de lá (ninguém coloca link qualquer no perfil).
export function capaDoDeezer(url) {
  if (typeof url !== 'string' || url.length > URL_MAX) return false;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && (hostname.endsWith('.dzcdn.net') || hostname === 'dzcdn.net' || hostname.endsWith('.deezer.com'));
  } catch {
    return false;
  }
}

const texto = (valor) => (typeof valor === 'string' ? valor.replace(/\s+/g, ' ').trim() : '');

function item(bruto, tipo, capaValida) {
  if (!bruto || typeof bruto !== 'object') return null;
  const id = typeof bruto.id === 'number' || typeof bruto.id === 'string' ? String(bruto.id).slice(0, 40) : '';
  const titulo = texto(bruto.titulo);
  const artista = tipo === 'artistas' ? null : texto(bruto.artista) || null;
  const capa = typeof bruto.capa === 'string' ? bruto.capa : '';
  if (!id || !titulo || titulo.length > TEXTO_MAX || (artista ?? '').length > TEXTO_MAX) return null;
  if (!capa || !capaValida(capa)) return null;
  return { id, titulo, ...(tipo !== 'artistas' && { artista }), capa };
}

/** Valida o que a pessoa mandou salvar: { favoritos } ou { erro }. Repetidos são ignorados. */
export function validarFavoritos(valor, { capaValida = capaDoDeezer } = {}) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return { erro: 'Favoritos inválidos.' };
  const favoritos = favoritosVazios();
  for (const tipo of TIPOS_FAVORITO) {
    const lista = valor[tipo] ?? [];
    if (!Array.isArray(lista)) return { erro: 'Favoritos inválidos.' };
    if (lista.length > FAVORITOS_MAX) return { erro: `Escolha no máximo ${FAVORITOS_MAX} favoritos de cada tipo.` };
    for (const bruto of lista) {
      const limpo = item(bruto, tipo, capaValida);
      if (!limpo) return { erro: 'Favorito inválido. Escolha de novo pela busca.' };
      if (!favoritos[tipo].some((f) => f.id === limpo.id)) favoritos[tipo].push(limpo);
    }
  }
  return { favoritos };
}

/** Lê o que está guardado sem confiar no formato: o que estiver estranho fica de fora. */
export function lerFavoritos(guardado, { capaValida = () => true } = {}) {
  const favoritos = favoritosVazios();
  if (!guardado || typeof guardado !== 'object') return favoritos;
  for (const tipo of TIPOS_FAVORITO) {
    const lista = Array.isArray(guardado[tipo]) ? guardado[tipo] : [];
    favoritos[tipo] = lista.map((bruto) => item(bruto, tipo, capaValida)).filter(Boolean).slice(0, FAVORITOS_MAX);
  }
  return favoritos;
}
