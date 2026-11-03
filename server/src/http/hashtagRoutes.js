import { Router } from 'express';
import { asyncRoute, requireAuth, requireUsername } from './middlewares.js';

export function createHashtagRoutes({ hashtagService }) {
  const router = Router();
  router.use(requireAuth, requireUsername);

  router.get('/em-alta', asyncRoute(async (req, res) => {
    res.json(await hashtagService.trending());
  }));

  router.get('/', asyncRoute(async (req, res) => {
    res.json(await hashtagService.search(req.query.q));
  }));

  return router;
}
