import { Router } from 'express';
import { asyncRoute, requireAuth, requireUsername } from './middlewares.js';

export function createMusicRoutes({ musicService }) {
  const router = Router();
  router.use(requireAuth, requireUsername);

  router.get('/search', asyncRoute(async (req, res) => {
    res.json(await musicService.search(req.query.q));
  }));

  return router;
}
