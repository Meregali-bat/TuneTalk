import { badGateway } from '../errors.js';

// API pública do Deezer: não exige chave, então nenhuma credencial vai para o navegador.
const DEEZER_SEARCH_URL = {
  musica: 'https://api.deezer.com/search',
  album: 'https://api.deezer.com/search/album',
  artista: 'https://api.deezer.com/search/artist',
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

const toArtist = (artist) => ({
  id: artist.id,
  tipo: 'artista',
  titulo: artist.name,
  capa: artist.picture_medium,
  fas: artist.nb_fan,
});

const MAPEAR = { musica: toTrack, album: toAlbum, artista: toArtist };

export function createMusicService({ fetch = globalThis.fetch } = {}) {
  const firstPreview = async (q) => {
    const response = await fetch(`${DEEZER_SEARCH_URL.musica}?q=${encodeURIComponent(q)}&limit=1`);
    if (!response.ok) throw badGateway('Falha ao buscar músicas.');
    const body = await response.json();
    return body.data?.[0]?.preview || null;
  };

  return {
    // O Deezer entrega links de prévia que expiram (e os do sistema antigo já não funcionam):
    // na hora de tocar, buscamos a faixa de novo pelo artista e título para ter um link válido.
    async preview(titulo, artista) {
      const t = (titulo ?? '').trim();
      const a = (artista ?? '').trim();
      if (!t) return null;
      return (await firstPreview(`artist:"${a}" track:"${t}"`)) ?? firstPreview(`${a} ${t}`.trim());
    },

    // tipo: 'musica' (faixas, padrão), 'album' ou 'artista'.
    async search(query, tipo = 'musica') {
      const q = (query ?? '').trim();
      if (!q) return [];
      const chave = Object.hasOwn(MAPEAR, tipo) ? tipo : 'musica';

      const response = await fetch(`${DEEZER_SEARCH_URL[chave]}?q=${encodeURIComponent(q)}`);
      if (!response.ok) throw badGateway('Falha ao buscar músicas.');

      const body = await response.json();
      return (body.data ?? []).map(MAPEAR[chave]);
    },
  };
}
