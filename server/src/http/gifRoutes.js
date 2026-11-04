import { Router } from 'express';
import { asyncRoute, requireAuth, requireUsername } from './middlewares.js';

export function createGifRoutes({ gifService }) {
  const router = Router();
  router.use(requireAuth, requireUsername);

  // Sem q (ou vazio), os GIFs em alta.
  router.get('/', asyncRoute(async (req, res) => {
    res.json(await gifService.search(req.query.q));
  }));

  return router;
}
