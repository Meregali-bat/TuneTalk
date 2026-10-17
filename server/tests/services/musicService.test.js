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
      { id: 1, titulo: 'Help!', artista: 'The Beatles', capa: 'help.jpg', duracao: 138, preview: 'help.mp3' },
    ]);
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
