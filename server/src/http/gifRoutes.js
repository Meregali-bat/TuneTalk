import { Router } from 'express';
import { asyncRoute, requireAuth, requireUsername } from './middlewares.js';
import { criarLimites } from './limites.js';

export function createGifRoutes({ gifService, limitador }) {
  const router = Router();
  router.use(requireAuth, requireUsername, criarLimites(limitador)('externas'));

  // Sem q (ou vazio), os GIFs em alta.
  router.get('/', asyncRoute(async (req, res) => {
    res.json(await gifService.search(req.query.q));
  }));

  return router;
}
