import { describe, it, expect, vi } from 'vitest';
import { descreverPost, injetarMeta, metaTags } from '../../src/share/postMeta.js';
import { montarCard, renderizarCard } from '../../src/share/postCard.js';

const autor = { nome: 'ana', nomeExibicao: 'Ana Souza', fotoPerfil: 'https://res.cloudinary.com/x/image/upload/ana.png' };
const INDEX = `<html><head>
    <title>TuneTalk</title>
    <meta name="description" content="genérica" />
    <meta property="og:title" content="TuneTalk" />
    <meta name="twitter:card" content="summary" />
  </head><body><div id="root"></div></body></html>`;

describe('descreverPost', () => {
  it('post de música leva obra, artista e nota no título', () => {
    const post = { texto: 'Obra-prima.', titulo: 'Blonde', artista: 'Frank Ocean', nota: 9, autor };
    expect(descreverPost(post)).toEqual({ titulo: 'Ana Souza sobre Blonde — Frank Ocean · 4,5★', descricao: 'Obra-prima.' });
  });

  it('post só de texto usa o nome e o @, e corta texto comprido', () => {
    const { titulo, descricao } = descreverPost({ texto: 'a '.repeat(300), autor });
    expect(titulo).toBe('Ana Souza (@ana) no TuneTalk');
    expect(descricao.length).toBeLessThanOrEqual(200);
    expect(descricao.endsWith('…')).toBe(true);
  });

  it('enquete sem texto descreve as opções', () => {
    const post = { texto: '', autor, enquete: { total: 0, opcoes: [{ titulo: 'Brat' }, { titulo: 'GNX' }] } };
    expect(descreverPost(post)).toEqual({ titulo: 'Enquete de Ana Souza no TuneTalk', descricao: 'Brat · GNX' });
  });
});

describe('injetarMeta', () => {
  it('troca o título e as tags genéricas pelas do post, escapando o texto', () => {
    const tags = metaTags({ titulo: 'A <b>"x"</b>', descricao: 'd', url: 'https://t.app/post/1', imagem: 'https://t.app/api/og/post/1.png' });
    const html = injetarMeta(INDEX, tags);
    expect(html).toContain('<title>A &lt;b&gt;&quot;x&quot;&lt;/b&gt;</title>');
    expect(html).toContain('<meta property="og:image" content="https://t.app/api/og/post/1.png" />');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(html).not.toContain('genérica');
    expect(html.match(/og:title/g)).toHaveLength(1);
    expect(html).toContain('<div id="root"></div>');
  });
});

describe('cartão do post', () => {
  it('só baixa imagens do Deezer e do Cloudinary', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('x', { headers: { 'content-type': 'text/html' } }));
    const post = { id: 1, texto: 'oi', titulo: 'T', capa: 'http://169.254.169.254/latest', autor };
    const png = await renderizarCard(post, { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toContain('res.cloudinary.com/x/image/upload/f_jpg');
    expect(png.subarray(1, 4).toString()).toBe('PNG');
  });

  it('mostra a capa ao lado só quando ela existe', () => {
    const comCapa = montarCard({ texto: 'oi', titulo: 'T', autor }, { capa: 'data:image/png;base64,AA', foto: null });
    const semCapa = montarCard({ texto: 'oi', titulo: 'T', autor }, { capa: null, foto: null });
    expect(comCapa.props.children).toHaveLength(2);
    expect(semCapa.props.children).toHaveLength(1);
  });
});
