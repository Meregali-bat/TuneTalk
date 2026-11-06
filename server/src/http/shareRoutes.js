import { Router } from 'express';
import { descreverPost, injetarMeta, metaTags } from '../share/postMeta.js';
import { criarLimites } from './limites.js';

const idValido = (valor) => /^\d{1,10}$/.test(valor) && Number(valor) > 0;

// A versão no fim da URL faz os apps buscarem a imagem de novo quando o post muda (ex.: votos).
const versaoDaImagem = (post) => (post.enquete ? `?v=${post.enquete.total}` : '');

/**
 * Links de post com cartão bonito ao compartilhar:
 * - GET /post/:id devolve o mesmo index.html do app, com as tags Open Graph daquele post;
 * - GET /api/og/post/:id.png é a imagem do cartão.
 * Quem abre no navegador vê o app normal; só os robôs de prévia leem as tags.
 */
export function createSharePageRoutes({ sharePreview }) {
  const router = Router();

  router.get('/post/:id', async (req, res, next) => {
    let html;
    try {
      html = await sharePreview.carregarIndex();
    } catch (err) {
      return next(err);
    }
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-cache, must-revalidate');

    const { id } = req.params;
    let post = null;
    try {
      post = idValido(id) ? await sharePreview.findPost(Number(id)) : null;
    } catch {
      // Banco fora do ar: o app abre do mesmo jeito, só sem o cartão.
    }
    if (!post) return res.send(html);

    const { titulo, descricao } = descreverPost(post);
    const url = `${sharePreview.appUrl}/post/${post.id}`;
    const imagem = `${sharePreview.appUrl}/api/og/post/${post.id}.png${versaoDaImagem(post)}`;
    res.send(injetarMeta(html, metaTags({ titulo, descricao, url, imagem })));
  });

  return router;
}

export function createShareApiRoutes({ sharePreview, limitador }) {
  const router = Router();
  const limite = criarLimites(limitador);

  // Cartão da prévia do link (1200×630) e imagem vertical para o Stories (1080×1920).
  const imagem = (formato) => async (req, res, next) => {
    const { id } = req.params;
    try {
      const post = idValido(id) ? await sharePreview.findPost(Number(id)) : null;
      if (!post) return res.status(404).json({ error: 'Post não encontrado.' });
      // Cada query diferente é uma entrada nova no cache da CDN. Sem isto, ?x=1, ?x=2... obrigaria
      // a gerar a imagem de novo a cada requisição; com isto, só a URL oficial chega a ser gerada.
      const versao = versaoDaImagem(post);
      const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
      if (query !== versao) {
        res.set('Cache-Control', 'public, max-age=60, s-maxage=60');
        return res.redirect(302, `${req.baseUrl}${req.path}${versao}`);
      }
      const png = await sharePreview.renderizarImagem(post, formato);
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
      res.send(png);
    } catch (err) {
      next(err);
    }
  };
  router.get('/og/post/:id.png', limite('imagemOg'), imagem('cartao'));
  router.get('/og/post/:id/stories.png', limite('imagemOg'), imagem('story'));

  return router;
}
