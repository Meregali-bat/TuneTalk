import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { buildTestApp } from '../helpers/buildTestApp.js';

const INDEX = '<html><head><title>TuneTalk</title></head><body><div id="root"></div></body></html>';
const post = { id: 7, texto: 'Que disco.', titulo: 'Blonde', artista: 'Frank Ocean', nota: 10, autor: { nome: 'ana', nomeExibicao: 'Ana' } };

function montar(findPost = vi.fn().mockResolvedValue(post)) {
  const sharePreview = {
    appUrl: 'https://tunetalk.app',
    findPost,
    carregarIndex: vi.fn().mockResolvedValue(INDEX),
    renderizarImagem: vi.fn().mockResolvedValue(Buffer.from('png')),
  };
  return { ...buildTestApp({ sharePreview }), sharePreview };
}

describe('link de post compartilhado', () => {
  it('GET /post/:id devolve o app com as tags do post, sem precisar de login', async () => {
    const { app, sharePreview } = montar();
    const res = await request(app).get('/post/7').expect(200);

    expect(sharePreview.findPost).toHaveBeenCalledWith(7);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('<meta property="og:title" content="Ana sobre Blonde — Frank Ocean · 5★" />');
    expect(res.text).toContain('content="https://tunetalk.app/api/og/post/7.png"');
    expect(res.text).toContain('<link rel="canonical" href="https://tunetalk.app/post/7" />');
    expect(res.text).toContain('<div id="root"></div>');
  });

  it('post que não existe, id estranho ou banco fora do ar abrem o app normal', async () => {
    const { app } = montar(vi.fn().mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('fora')));
    expect((await request(app).get('/post/99').expect(200)).text).toBe(INDEX);
    expect((await request(app).get('/post/1').expect(200)).text).toBe(INDEX);
    expect((await request(app).get('/post/abc').expect(200)).text).toBe(INDEX);
  });

  it('GET /api/og/post/:id.png devolve a imagem do cartão', async () => {
    const { app, sharePreview } = montar();
    const res = await request(app).get('/api/og/post/7.png').expect(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['cache-control']).toContain('s-maxage');
    expect(sharePreview.renderizarImagem).toHaveBeenCalledWith(post, 'cartao');
  });

  it('GET /api/og/post/:id/stories.png devolve a imagem vertical do Stories', async () => {
    const { app, sharePreview } = montar();
    const res = await request(app).get('/api/og/post/7/stories.png').expect(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(sharePreview.renderizarImagem).toHaveBeenCalledWith(post, 'story');
  });

  it('imagem de post que não existe é 404', async () => {
    const { app } = montar(vi.fn().mockResolvedValue(null));
    await request(app).get('/api/og/post/8.png').expect(404);
  });
});
