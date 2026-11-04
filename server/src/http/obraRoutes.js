import { Router } from 'express';
import { asyncRoute, currentUserId, requireAuth, requireUsername } from './middlewares.js';

// Página de um álbum ou música: /api/obras/album?titulo=…&artista=… (ou /musica).
// Com antes e antesId, a página seguinte dos posts.
export function createObraRoutes({ postService }) {
  const router = Router();
  router.use(requireAuth, requireUsername);

  router.get('/:tipo(album|musica)', asyncRoute(async (req, res) => {
    const { titulo, artista, antes, antesId } = req.query;
    const pagina = antes !== undefined || antesId !== undefined ? { antes, antesId } : undefined;
    res.json(await postService.obra(currentUserId(req), { tipo: req.params.tipo, titulo, artista }, pagina));
  }));

  return router;
}
