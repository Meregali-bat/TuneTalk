import { Router } from 'express';
import { notFound } from '../errors.js';
import { asyncRoute, requireAuth, requireUsername } from './middlewares.js';

export function createMusicRoutes({ musicService, lyricsService }) {
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

  // Versos da letra para escolher o trecho do post. 404 sem letra; 503 se a base de letras falhar.
  router.get('/lyrics', asyncRoute(async (req, res) => {
    const letra = await lyricsService.letra(req.query.titulo, req.query.artista, req.query.duracao);
    if (!letra) throw notFound('Letra não encontrada.');
    res.json(letra);
  }));

  return router;
}
