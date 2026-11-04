import { describe, it, expect, vi } from 'vitest';
import { createGifService } from '../../src/services/gifService.js';

const okResponse = (body) => ({ ok: true, json: async () => body });

const giphyGif = {
  id: 'abc',
  title: 'Dançando',
  images: {
    fixed_width_downsampled: { url: 'https://media.giphy.com/abc/200w_d.gif', width: '200', height: '150' },
    downsized_medium: { url: 'https://media.giphy.com/abc/giphy.gif', width: '480', height: '360' },
  },
};

describe('gifService', () => {
  it('busca no GIPHY e devolve prévia, link grande e tamanho', async () => {
    const fetch = vi.fn().mockResolvedValue(okResponse({ data: [giphyGif] }));
    const result = await createGifService({ apiKey: 'chave', fetch }).search('  dança ');

    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://api.giphy.com/v1/gifs/search');
    expect(url.searchParams.get('q')).toBe('dança');
    expect(url.searchParams.get('api_key')).toBe('chave');
    expect(url.searchParams.get('rating')).toBe('pg-13');
    expect(result).toEqual([{
      id: 'abc', titulo: 'Dançando', previa: 'https://media.giphy.com/abc/200w_d.gif',
      url: 'https://media.giphy.com/abc/giphy.gif', largura: 480, altura: 360,
    }]);
  });

  it('sem termo mostra os GIFs em alta', async () => {
    const fetch = vi.fn().mockResolvedValue(okResponse({ data: [] }));
    await createGifService({ apiKey: 'chave', fetch }).search('');
    expect(new URL(fetch.mock.calls[0][0]).pathname).toBe('/v1/gifs/trending');
  });

  it('descarta GIFs sem as versões necessárias', async () => {
    const fetch = vi.fn().mockResolvedValue(okResponse({ data: [{ id: 'x', images: {} }, giphyGif] }));
    const result = await createGifService({ apiKey: 'chave', fetch }).search('x');
    expect(result.map((g) => g.id)).toEqual(['abc']);
  });

  it('sem chave responde 503 sem chamar a API; falha do GIPHY vira 502', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false });
    await expect(createGifService({ fetch }).search('x')).rejects.toMatchObject({ status: 503 });
    expect(fetch).not.toHaveBeenCalled();
    await expect(createGifService({ apiKey: 'chave', fetch }).search('x')).rejects.toMatchObject({ status: 502 });
  });
});
