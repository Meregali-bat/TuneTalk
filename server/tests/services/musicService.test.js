import { describe, it, expect, vi } from 'vitest';
import { createMusicService } from '../../src/services/musicService.js';

const deezerTrack = {
  id: 1,
  title: 'Help!',
  duration: 138,
  preview: 'help.mp3',
  artist: { name: 'The Beatles' },
  album: { cover_medium: 'help.jpg' },
};

const okResponse = (body) => ({ ok: true, json: async () => body });

describe('musicService', () => {
  it('busca faixas no Deezer e devolve no formato da API', async () => {
    const fetch = vi.fn().mockResolvedValue(okResponse({ data: [deezerTrack] }));
    const music = createMusicService({ fetch });

    const result = await music.search('help me');

    expect(fetch).toHaveBeenCalledWith('https://api.deezer.com/search?q=help%20me');
    expect(result).toEqual([
      { id: 1, tipo: 'musica', titulo: 'Help!', artista: 'The Beatles', capa: 'help.jpg', duracao: 138, preview: 'help.mp3' },
    ]);
  });

  it('busca álbuns na busca de álbuns do Deezer', async () => {
    const fetch = vi.fn().mockResolvedValue(okResponse({
      data: [{ id: 9, title: 'Abbey Road', nb_tracks: 17, cover_medium: 'abbey.jpg', artist: { name: 'The Beatles' } }],
    }));
    const music = createMusicService({ fetch });

    const result = await music.search('abbey road', 'album');

    expect(fetch).toHaveBeenCalledWith('https://api.deezer.com/search/album?q=abbey%20road');
    expect(result).toEqual([{ id: 9, tipo: 'album', titulo: 'Abbey Road', artista: 'The Beatles', capa: 'abbey.jpg', faixas: 17 }]);
  });

  it('devolve lista vazia sem chamar a API para busca em branco', async () => {
    const fetch = vi.fn();
    const music = createMusicService({ fetch });
    expect(await music.search('   ')).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('lança 502 quando o provedor falha', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const music = createMusicService({ fetch });
    await expect(music.search('x')).rejects.toMatchObject({ status: 502 });
  });

  it('tolera resposta sem "data"', async () => {
    const fetch = vi.fn().mockResolvedValue(okResponse({ error: {} }));
    const music = createMusicService({ fetch });
    expect(await music.search('x')).toEqual([]);
  });
});
