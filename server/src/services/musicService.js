import { badGateway } from '../errors.js';

// API pública do Deezer: não exige chave, então nenhuma credencial vai para o navegador.
const DEEZER_SEARCH_URL = {
  musica: 'https://api.deezer.com/search',
  album: 'https://api.deezer.com/search/album',
};

const toTrack = (track) => ({
  id: track.id,
  tipo: 'musica',
  titulo: track.title,
  artista: track.artist?.name,
  capa: track.album?.cover_medium,
  duracao: track.duration,
  preview: track.preview,
});

const toAlbum = (album) => ({
  id: album.id,
  tipo: 'album',
  titulo: album.title,
  artista: album.artist?.name,
  capa: album.cover_medium,
  faixas: album.nb_tracks,
});

export function createMusicService({ fetch = globalThis.fetch } = {}) {
  return {
    // tipo: 'musica' (faixas, padrão) ou 'album'.
    async search(query, tipo = 'musica') {
      const q = (query ?? '').trim();
      if (!q) return [];
      const isAlbum = tipo === 'album';

      const response = await fetch(`${DEEZER_SEARCH_URL[isAlbum ? 'album' : 'musica']}?q=${encodeURIComponent(q)}`);
      if (!response.ok) throw badGateway('Falha ao buscar músicas.');

      const body = await response.json();
      return (body.data ?? []).map(isAlbum ? toAlbum : toTrack);
    },
  };
}
