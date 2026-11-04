import { HttpError, badGateway } from '../errors.js';

// GIPHY: a chave fica no servidor (GIPHY_API_KEY). Sem busca, mostra os GIFs em alta.
const GIPHY_URL = 'https://api.giphy.com/v1/gifs';
const POR_PAGINA = 24;

// previa: versão leve para a grade; url: versão que vai para o Cloudinary ao publicar
// (downsized_medium fica abaixo de 5 MB, dentro do limite de 10 MB do plano grátis).
const toGif = (gif) => {
  const previa = gif.images?.fixed_width_downsampled ?? gif.images?.fixed_width;
  const grande = gif.images?.downsized_medium ?? gif.images?.original;
  const largura = Number(grande?.width);
  const altura = Number(grande?.height);
  if (!previa?.url || !grande?.url || !largura || !altura) return null;
  return {
    id: gif.id,
    titulo: gif.title || 'GIF',
    previa: previa.url,
    url: grande.url,
    largura,
    altura,
  };
};

export function createGifService({ apiKey, fetch = globalThis.fetch } = {}) {
  return {
    async search(query) {
      if (!apiKey) throw new HttpError(503, 'A busca de GIFs não está disponível agora.');
      const q = (query ?? '').trim().slice(0, 50);
      const params = new URLSearchParams({ api_key: apiKey, limit: String(POR_PAGINA), rating: 'pg-13', bundle: 'messaging_non_clips' });
      if (q) {
        params.set('q', q);
        params.set('lang', 'pt');
      }
      const response = await fetch(`${GIPHY_URL}/${q ? 'search' : 'trending'}?${params}`);
      if (!response.ok) throw badGateway('Falha ao buscar GIFs.');
      const body = await response.json();
      return (body.data ?? []).map(toGif).filter(Boolean);
    },
  };
}
