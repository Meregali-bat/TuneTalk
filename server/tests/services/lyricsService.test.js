import { describe, it, expect, vi } from 'vitest';
import { createLyricsService } from '../../src/services/lyricsService.js';

const resposta = (body, { ok = true, status = 200 } = {}) => ({ ok, status, json: async () => body });
const resultado = (extra) => ({ trackName: 'Canção', artistName: 'Artista', duration: 200, instrumental: false, plainLyrics: 'Primeiro verso\nSegundo verso', ...extra });

describe('lyricsService', () => {
  it('busca na LRCLIB pelo título e artista e devolve os versos', async () => {
    const fetch = vi.fn().mockResolvedValue(resposta([resultado({ plainLyrics: '[Refrão]\nPrimeiro verso\n\n  Segundo   verso \n' })]));
    const letras = createLyricsService({ fetch });

    expect(await letras.letra(' Canção ', 'Artista')).toEqual({ versos: ['Primeiro verso', 'Segundo verso'] });
    const [url, opcoes] = fetch.mock.calls[0];
    expect(url).toBe('https://lrclib.net/api/search?track_name=Can%C3%A7%C3%A3o&artist_name=Artista');
    expect(opcoes.signal).toBeInstanceOf(AbortSignal);
    expect(opcoes.headers['User-Agent']).toMatch(/TuneTalk/);
  });

  it('prefere o resultado com a duração mais próxima e pula instrumentais e sem letra', async () => {
    const fetch = vi.fn().mockResolvedValue(resposta([
      resultado({ duration: 120, plainLyrics: 'versão curta' }),
      resultado({ duration: 201, instrumental: true, plainLyrics: 'x' }),
      resultado({ duration: 199, plainLyrics: null }),
      resultado({ duration: 205, plainLyrics: 'versão do álbum' }),
    ]));
    expect(await createLyricsService({ fetch }).letra('Canção', 'Artista', '200')).toEqual({ versos: ['versão do álbum'] });
  });

  it('devolve null quando não acha letra (lista vazia, 404 ou título vazio)', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(resposta([]))
      .mockResolvedValueOnce(resposta(null, { ok: false, status: 404 }))
      .mockResolvedValueOnce(resposta([resultado({ instrumental: true })]));
    const letras = createLyricsService({ fetch });
    expect(await letras.letra('a', 'b')).toBeNull();
    expect(await letras.letra('a', 'b')).toBeNull();
    expect(await letras.letra('a', 'b')).toBeNull();
    expect(await letras.letra('  ', 'b')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  describe('quando a LRCLIB quebra, responde 503 em vez de explodir', () => {
    const falhas = {
      'erro de rede': () => Promise.reject(new TypeError('fetch failed')),
      'erro 500': () => Promise.resolve(resposta({}, { ok: false, status: 500 })),
      'JSON inválido': () => Promise.resolve({ ok: true, status: 200, json: async () => { throw new SyntaxError('x'); } }),
      'formato inesperado': () => Promise.resolve(resposta({ erro: 'mudou' })),
    };
    for (const [nome, falha] of Object.entries(falhas)) {
      it(nome, async () => {
        const letras = createLyricsService({ fetch: vi.fn(falha) });
        await expect(letras.letra('a', 'b')).rejects.toMatchObject({ status: 503, message: 'Não foi possível carregar a letra agora.' });
      });
    }

    it('demora demais (tempo limite)', async () => {
      const fetch = vi.fn((url, { signal }) => new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason));
      }));
      const letras = createLyricsService({ fetch, timeoutMs: 20 });
      await expect(letras.letra('a', 'b')).rejects.toMatchObject({ status: 503 });
    });

    it('ignora itens estranhos na lista', async () => {
      const fetch = vi.fn().mockResolvedValue(resposta([null, 'x', 42, resultado({ plainLyrics: 'ok' })]));
      expect(await createLyricsService({ fetch }).letra('a', 'b')).toEqual({ versos: ['ok'] });
    });
  });
});
