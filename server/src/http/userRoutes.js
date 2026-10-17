import { Router } from 'express';
import {
  asyncRoute, currentUserId, imageUpload, parseIdParam, requireAuth, uploadedImageUrl,
} from './middlewares.js';

export function createUserRoutes({ userService, uploader }) {
  const router = Router();
  router.use(requireAuth);
  router.param('id', parseIdParam);

  router.put('/me', imageUpload.single('foto'), asyncRoute(async (req, res) => {
    const { nome, bio } = req.body;
    const fotoPerfil = await uploadedImageUrl(uploader, req.file);
    const usuario = await userService.updateProfile(currentUserId(req), { nome, bio, fotoPerfil });
    if (usuario.nome) req.session.user = { ...req.session.user, nome: usuario.nome };
    res.json(usuario);
  }));

  router.get('/:id', asyncRoute(async (req, res) => {
    res.json(await userService.getProfile(req.params.id, currentUserId(req)));
  }));

  router.post('/:id/follow', asyncRoute(async (req, res) => {
    await userService.follow(currentUserId(req), req.params.id);
    res.status(204).end();
  }));

  router.delete('/:id/follow', asyncRoute(async (req, res) => {
    await userService.unfollow(currentUserId(req), req.params.id);
    res.status(204).end();
  }));

  return router;
}
