import { Router } from 'express';
import { notFound } from '../errors.js';
import { asyncRoute, requireAuth, requireUsername } from './middlewares.js';

export function createMusicRoutes({ musicService }) {
  const router = Router();
  router.use(requireAuth, requireUsername);

  router.get('/search', asyncRoute(async (req, res) => {
    res.json(await musicService.search(req.query.q, req.query.tipo === 'album' ? 'album' : 'musica'));
  }));

  router.get('/preview', asyncRoute(async (req, res) => {
    const preview = await musicService.preview(req.query.titulo, req.query.artista);
    if (!preview) throw notFound('Prévia não encontrada.');
    res.json({ preview });
  }));

  return router;
}
