import { Router } from 'express';
import { asyncRoute, currentUserId, requireAuth, requireUsername } from './middlewares.js';
import { criarLimites } from './limites.js';

// Lista "Quero ouvir" de quem está logado. O disco vai no corpo (POST) ou na query (DELETE):
// { tipo: 'album' | 'musica', titulo, artista, capa?, releaseDate?, preview? }.
export function createQueroOuvirRoutes({ queroOuvirService, limitador }) {
  const router = Router();
  const limite = criarLimites(limitador);
  router.use(requireAuth, requireUsername);

  router.get('/', asyncRoute(async (req, res) => {
    res.json(await queroOuvirService.listar(currentUserId(req)));
  }));

  router.post('/', limite('perfil'), asyncRoute(async (req, res) => {
    res.status(201).json(await queroOuvirService.adicionar(currentUserId(req), req.body));
  }));

  router.delete('/', limite('perfil'), asyncRoute(async (req, res) => {
    const { tipo, titulo, artista } = req.query;
    await queroOuvirService.remover(currentUserId(req), { tipo, titulo, artista });
    res.status(204).end();
  }));

  return router;
}
