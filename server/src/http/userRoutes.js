import { Router } from 'express';
import { badRequest } from '../errors.js';
import { asyncRoute, currentUserId, parseIdParam, requireAuth, requireUsername } from './middlewares.js';

export function createUserRoutes({ userService, uploader, sessions }) {
  const router = Router();
  router.use(requireAuth);
  router.param('id', parseIdParam);

  // Única rota liberada antes de o usuário ter um nome.
  router.put('/me/username', asyncRoute(async (req, res) => {
    const { nome } = await userService.setUsername(currentUserId(req), req.body.nome);
    req.session.user = { ...req.session.user, nome };
    res.json(req.session.user);
  }));

  router.use(requireUsername);

  router.put('/me/password', asyncRoute(async (req, res) => {
    await userService.changePassword(currentUserId(req), req.body.senhaAtual, req.body.novaSenha);
    await sessions?.destroyOthers(currentUserId(req), req.sessionID);
    res.status(204).end();
  }));

  router.post('/me/photo-upload', (req, res) => {
    res.json(uploader.signUpload());
  });

  router.post('/me/banner-upload', (req, res) => {
    res.json(uploader.signUpload('banner'));
  });

  router.put('/me', asyncRoute(async (req, res) => {
    const { nome, nomeExibicao, bio, fotoPerfil, bannerUrl } = req.body;
    if (fotoPerfil !== undefined && !uploader.isOwnUrl(fotoPerfil)) throw badRequest('Foto inválida. Envie a imagem de novo.');
    if (bannerUrl !== undefined && !uploader.isOwnUrl(bannerUrl, 'banner')) throw badRequest('Capa inválida. Envie a imagem de novo.');
    const usuario = await userService.updateProfile(currentUserId(req), { nome, bio, nomeExibicao, fotoPerfil, bannerUrl });
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
