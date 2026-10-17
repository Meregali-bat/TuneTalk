import { badGateway } from '../errors.js';

// API pública do Deezer: não exige chave, então nenhuma credencial vai para o navegador.
const DEEZER_SEARCH_URL = 'https://api.deezer.com/search';

const toTrack = (track) => ({
  id: track.id,
  titulo: track.title,
  artista: track.artist?.name,
  capa: track.album?.cover_medium,
  duracao: track.duration,
  preview: track.preview,
});

export function createMusicService({ fetch = globalThis.fetch } = {}) {
  return {
    async search(query) {
      const q = (query ?? '').trim();
      if (!q) return [];

      const response = await fetch(`${DEEZER_SEARCH_URL}?q=${encodeURIComponent(q)}`);
      if (!response.ok) throw badGateway('Falha ao buscar músicas.');

      const body = await response.json();
      return (body.data ?? []).map(toTrack);
    },
  };
}
