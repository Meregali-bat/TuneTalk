import { Router } from 'express';
import { badRequest } from '../errors.js';
import { asyncRoute, currentUserId, parseIdParam, requireAuth, requireUsername } from './middlewares.js';

export function createPostRoutes({ postService }) {
  const router = Router();
  router.use(requireAuth, requireUsername);
  router.param('id', parseIdParam);

  const feeds = {
    foryou: postService.forYou,
    seguindo: postService.following,
  };

  router.get('/', asyncRoute(async (req, res) => {
    const loadFeed = feeds[req.query.feed];
    if (!loadFeed) throw badRequest('Feed inválido.');
    res.json(await loadFeed(currentUserId(req)));
  }));

  // Comentários são posts com parentId no corpo.
  router.post('/', asyncRoute(async (req, res) => {
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

  router.post('/:id/like', asyncRoute(async (req, res) => {
    res.json({ likes: await postService.like(req.params.id, currentUserId(req)) });
  }));

  router.delete('/:id/like', asyncRoute(async (req, res) => {
    res.json({ likes: await postService.unlike(req.params.id, currentUserId(req)) });
  }));

  return router;
}
