import { Router } from 'express';
import { badRequest } from '../errors.js';
import { asyncRoute, currentUserId, parseIdParam, requireAuth, requireUsername } from './middlewares.js';
import { criarLimites } from './limites.js';

export function createPostRoutes({ postService, uploader, limitador }) {
  const router = Router();
  const limite = criarLimites(limitador);
  router.use(requireAuth, requireUsername);
  router.param('id', parseIdParam);

  const feeds = {
    foryou: postService.forYou,
    seguindo: postService.following,
  };

  router.get('/', asyncRoute(async (req, res) => {
    if (req.query.tag !== undefined) return res.json(await postService.byHashtag(req.query.tag, currentUserId(req)));
    const loadFeed = feeds[req.query.feed];
    if (!loadFeed) throw badRequest('Feed inválido.');
    const { antes, antesId } = req.query;
    res.json(await loadFeed(currentUserId(req), { antes, antesId }));
  }));

  // A imagem vai direto do navegador ao Cloudinary; aqui só assinamos e depois conferimos o link.
  router.post('/image-upload', limite('upload'), (req, res) => {
    res.json(uploader.signUpload('post'));
  });

  // Comentários são posts com parentId no corpo.
  router.post('/', limite('postar'), limite('postarHora'), asyncRoute(async (req, res) => {
    const { imagemUrl } = req.body;
    if (imagemUrl !== undefined && !uploader.isOwnUrl(imagemUrl, 'post')) throw badRequest('Imagem inválida. Envie de novo.');
    const id = await postService.create(currentUserId(req), req.body);
    res.status(201).json({ id });
  }));

  router.get('/:id', asyncRoute(async (req, res) => {
    res.json(await postService.get(req.params.id, currentUserId(req)));
  }));

  router.delete('/:id', asyncRoute(async (req, res) => {
    await postService.remove(req.params.id, currentUserId(req));
    res.status(204).end();
  }));

  router.post('/:id/pin', limite('perfil'), asyncRoute(async (req, res) => {
    await postService.pin(req.params.id, currentUserId(req));
    res.status(204).end();
  }));

  router.delete('/:id/pin', limite('perfil'), asyncRoute(async (req, res) => {
    await postService.unpin(req.params.id, currentUserId(req));
    res.status(204).end();
  }));

  router.post('/:id/votos', limite('interacao'), asyncRoute(async (req, res) => {
    res.json(await postService.votar(req.params.id, currentUserId(req), req.body?.opcaoId));
  }));

  router.post('/:id/like', limite('interacao'), asyncRoute(async (req, res) => {
    res.json({ likes: await postService.like(req.params.id, currentUserId(req)) });
  }));

  router.delete('/:id/like', limite('interacao'), asyncRoute(async (req, res) => {
    res.json({ likes: await postService.unlike(req.params.id, currentUserId(req)) });
  }));

  return router;
}
