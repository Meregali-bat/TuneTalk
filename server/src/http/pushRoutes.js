import { Router } from 'express';
import { asyncRoute, currentUserId, requireAuth } from './middlewares.js';
import { criarLimites } from './limites.js';

export function createPushRoutes({ pushService, limitador }) {
  const router = Router();
  const limite = criarLimites(limitador);

  // Chave pública para o navegador se inscrever (null quando os avisos estão desligados no servidor).
  router.get('/chave', (req, res) => {
    res.json({ chave: pushService?.chavePublica() ?? null });
  });

  router.use(requireAuth);

  router.post('/inscricoes', limite('perfil'), asyncRoute(async (req, res) => {
    await pushService.inscrever(currentUserId(req), req.body);
    res.status(204).end();
  }));

  router.delete('/inscricoes', asyncRoute(async (req, res) => {
    await pushService.cancelar(currentUserId(req), req.body?.endpoint);
    res.status(204).end();
  }));

  return router;
}
