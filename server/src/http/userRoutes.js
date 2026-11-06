import { Router } from 'express';
import { badRequest } from '../errors.js';
import { asyncRoute, currentUserId, parseIdParam, requireAuth, requireUsername } from './middlewares.js';

export function createUserRoutes({ userService, postService, restricaoService, sugestaoService, uploader, sessions }) {
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

  router.put('/me/email', asyncRoute(async (req, res) => {
    const { email } = await userService.changeEmail(currentUserId(req), req.body.senhaAtual, req.body.novoEmail);
    req.session.user = { ...req.session.user, email };
    res.json(req.session.user);
  }));

  // Presente dos 100 posts (o disco de vinil do feed).
  router.get('/me/presente', asyncRoute(async (req, res) => {
    res.json(await userService.presente(currentUserId(req)));
  }));

  router.post('/me/presente', asyncRoute(async (req, res) => {
    await userService.abrirPresente(currentUserId(req));
    res.status(204).end();
  }));

  router.put('/me/favoritos', asyncRoute(async (req, res) => {
    res.json(await userService.updateFavorites(currentUserId(req), req.body));
  }));

  router.post('/me/photo-upload', (req, res) => {
    res.json(uploader.signUpload());
  });

  router.post('/me/banner-upload', (req, res) => {
    res.json(uploader.signUpload('banner'));
  });

  router.put('/me', asyncRoute(async (req, res) => {
    const { nome, nomeExibicao, bio, fotoPerfil, bannerUrl, mostrarSeloFundador, efeitoPerfil, mostrarEfeito } = req.body;
    if (fotoPerfil !== undefined && !uploader.isOwnUrl(fotoPerfil)) throw badRequest('Foto inválida. Envie a imagem de novo.');
    if (bannerUrl !== undefined && !uploader.isOwnUrl(bannerUrl, 'banner')) throw badRequest('Capa inválida. Envie a imagem de novo.');
    const usuario = await userService.updateProfile(currentUserId(req), {
      nome, bio, nomeExibicao, fotoPerfil, bannerUrl, mostrarSeloFundador, efeitoPerfil, mostrarEfeito,
    });
    if (usuario.nome) req.session.user = { ...req.session.user, nome: usuario.nome };
    res.json(usuario);
  }));

  // Sugestões de quem seguir.
  router.get('/sugestoes', asyncRoute(async (req, res) => {
    res.json(await sugestaoService.listar(currentUserId(req)));
  }));

  // Quem a pessoa bloqueou e silenciou.
  router.get('/me/restricoes', asyncRoute(async (req, res) => {
    res.json(await restricaoService.listar(currentUserId(req)));
  }));

  // Link das marcações (@usuario) abre o perfil pelo nome.
  router.get('/by-name/:nome', asyncRoute(async (req, res) => {
    res.json(await userService.getProfileByName(req.params.nome, currentUserId(req)));
  }));

  router.get('/', asyncRoute(async (req, res) => {
    res.json(await userService.search(req.query.q, currentUserId(req)));
  }));

  router.get('/:id', asyncRoute(async (req, res) => {
    res.json(await userService.getProfile(req.params.id, currentUserId(req)));
  }));

  // Aba "Comentários" do perfil.
  router.get('/:id/comentarios', asyncRoute(async (req, res) => {
    res.json(await postService.repliesByAuthor(req.params.id, currentUserId(req)));
  }));

  router.post('/:id/follow', asyncRoute(async (req, res) => {
    await userService.follow(currentUserId(req), req.params.id);
    res.status(204).end();
  }));

  router.delete('/:id/follow', asyncRoute(async (req, res) => {
    await userService.unfollow(currentUserId(req), req.params.id);
    res.status(204).end();
  }));

  // Bloquear e silenciar (POST faz, DELETE desfaz).
  const acoes = [
    ['bloqueio', 'bloquear', 'desbloquear'],
    ['silencio', 'silenciar', 'dessilenciar'],
  ];
  for (const [caminho, fazer, desfazer] of acoes) {
    router.post(`/:id/${caminho}`, asyncRoute(async (req, res) => {
      await restricaoService[fazer](currentUserId(req), req.params.id);
      res.status(204).end();
    }));
    router.delete(`/:id/${caminho}`, asyncRoute(async (req, res) => {
      await restricaoService[desfazer](currentUserId(req), req.params.id);
      res.status(204).end();
    }));
  }

  return router;
}
