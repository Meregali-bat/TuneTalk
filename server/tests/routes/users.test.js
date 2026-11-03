import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { agentWithoutUsername, buildTestApp, loggedAgent } from '../helpers/buildTestApp.js';
import { HttpError } from '../../src/errors.js';

describe('rotas /api/users', () => {
  let app;
  let deps;
  let agent;

  beforeEach(async () => {
    ({ app, deps } = buildTestApp());
    agent = await loggedAgent(app);
  });

  it('exige autenticação', async () => {
    await request(app).get('/api/users/2').expect(401);
  });

  it('GET /api/users?q= busca pessoas', async () => {
    deps.userService.search.mockResolvedValue([{ id: 2, nome: 'bia', seguindo: true }]);
    const res = await agent.get('/api/users?q=bi');
    expect(res.body).toEqual([{ id: 2, nome: 'bia', seguindo: true }]);
    expect(deps.userService.search).toHaveBeenCalledWith('bi', 1);
  });

  it('GET /api/users/:id devolve o perfil visto pelo usuário logado', async () => {
    deps.userService.getProfile.mockResolvedValue({ usuario: { id: 2 } });
    const res = await agent.get('/api/users/2');
    expect(res.body).toEqual({ usuario: { id: 2 } });
    expect(deps.userService.getProfile).toHaveBeenCalledWith(2, 1);
  });

  describe('PUT /api/users/me/password', () => {
    it('troca a senha, derruba as outras sessões da pessoa e mantém a atual', async () => {
      deps.userService.changePassword.mockResolvedValue(undefined);
      await agent.put('/api/users/me/password').send({ senhaAtual: 'Atual!1', novaSenha: 'Nova!123' }).expect(204);

      expect(deps.userService.changePassword).toHaveBeenCalledWith(1, 'Atual!1', 'Nova!123');
      const [userId, keepSid] = deps.sessions.destroyOthers.mock.calls[0];
      expect(userId).toBe(1);
      expect(keepSid).toEqual(expect.any(String));
      await agent.get('/api/auth/me').expect(200);
    });

    it('repassa o erro de senha atual errada sem mexer nas sessões', async () => {
      deps.userService.changePassword.mockRejectedValue(new HttpError(400, 'A senha atual está incorreta.'));
      const res = await agent.put('/api/users/me/password').send({ senhaAtual: 'x', novaSenha: 'Nova!123' });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'A senha atual está incorreta.' });
      expect(deps.sessions.destroyOthers).not.toHaveBeenCalled();
    });
  });

  it('POST /api/users/me/banner-upload assina o envio da capa', async () => {
    deps.uploader.signUpload.mockReturnValue({ uploadUrl: 'u', fields: {} });
    await agent.post('/api/users/me/banner-upload').expect(200);
    expect(deps.uploader.signUpload).toHaveBeenCalledWith('banner');
  });

  it('POST /api/users/me/photo-upload devolve a assinatura para enviar a foto direto ao Cloudinary', async () => {
    deps.uploader.signUpload.mockReturnValue({ uploadUrl: 'https://api.cloudinary.com/x', fields: { signature: 's' } });
    const res = await agent.post('/api/users/me/photo-upload');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ uploadUrl: 'https://api.cloudinary.com/x', fields: { signature: 's' } });
  });

  describe('PUT /api/users/me', () => {
    it('atualiza nome e bio sem foto nova', async () => {
      deps.userService.updateProfile.mockResolvedValue({ id: 1, nome: 'Novo' });
      const res = await agent.put('/api/users/me').send({ nome: 'Novo', bio: 'bio' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 1, nome: 'Novo' });
      expect(deps.userService.updateProfile).toHaveBeenCalledWith(1, { nome: 'Novo', bio: 'bio', fotoPerfil: undefined });
    });

    it('salva o link da foto já enviada ao Cloudinary', async () => {
      deps.uploader.isOwnUrl.mockReturnValue(true);
      deps.userService.updateProfile.mockResolvedValue({ id: 1 });
      const url = 'https://res.cloudinary.com/tunetalk/image/upload/v1/tunetalk/perfis/a.gif';
      await agent.put('/api/users/me').send({ nome: 'N', fotoPerfil: url }).expect(200);
      expect(deps.uploader.isOwnUrl).toHaveBeenCalledWith(url);
      expect(deps.userService.updateProfile.mock.calls[0][1].fotoPerfil).toBe(url);
    });

    it('repassa nome de exibição e capa (conferindo que a capa é da pasta de banners)', async () => {
      deps.uploader.isOwnUrl.mockReturnValue(true);
      deps.userService.updateProfile.mockResolvedValue({ id: 1 });
      const banner = 'https://res.cloudinary.com/t/image/upload/v1/tunetalk/banners/b.jpg';
      await agent.put('/api/users/me').send({ nome: 'ana', nomeExibicao: 'Ana Souza', bannerUrl: banner }).expect(200);

      expect(deps.uploader.isOwnUrl).toHaveBeenCalledWith(banner, 'banner');
      expect(deps.userService.updateProfile).toHaveBeenCalledWith(1, {
        nome: 'ana', bio: undefined, nomeExibicao: 'Ana Souza', fotoPerfil: undefined, bannerUrl: banner,
      });
    });

    it('recusa capa que não veio do nosso Cloudinary', async () => {
      deps.uploader.isOwnUrl.mockReturnValue(false);
      const res = await agent.put('/api/users/me').send({ nome: 'N', bannerUrl: 'https://site.com/b.jpg' });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Capa inválida. Envie a imagem de novo.' });
    });

    it('recusa link de foto que não veio do nosso Cloudinary', async () => {
      deps.uploader.isOwnUrl.mockReturnValue(false);
      const res = await agent.put('/api/users/me').send({ nome: 'N', fotoPerfil: 'https://site.com/x.gif' });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Foto inválida. Envie a imagem de novo.' });
      expect(deps.userService.updateProfile).not.toHaveBeenCalled();
    });

    it('mantém o nome da sessão atualizado', async () => {
      deps.userService.updateProfile.mockResolvedValue({ id: 1, nome: 'Novo' });
      await agent.put('/api/users/me').send({ nome: 'Novo' });
      const me = await agent.get('/api/auth/me');
      expect(me.body.nome).toBe('Novo');
    });
  });

  it('POST /api/users/:id/follow segue', async () => {
    await agent.post('/api/users/2/follow').expect(204);
    expect(deps.userService.follow).toHaveBeenCalledWith(1, 2);
  });

  it('DELETE /api/users/:id/follow deixa de seguir', async () => {
    await agent.delete('/api/users/2/follow').expect(204);
    expect(deps.userService.unfollow).toHaveBeenCalledWith(1, 2);
  });

  describe('PUT /api/users/me/username', () => {
    it('define o nome de usuário e atualiza a sessão', async () => {
      const novo = await agentWithoutUsername(app, deps);
      deps.userService.setUsername.mockResolvedValue({ id: 9, nome: 'novo.user' });

      const res = await novo.put('/api/users/me/username').send({ nome: 'novo.user' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 9, nome: 'novo.user', email: 'novo@x.com' });
      expect(deps.userService.setUsername).toHaveBeenCalledWith(9, 'novo.user');
      expect((await novo.get('/api/auth/me')).body.nome).toBe('novo.user');
    });

    it('propaga nome inválido ou já usado', async () => {
      deps.userService.setUsername.mockRejectedValue(new HttpError(409, 'Esse nome de usuário já está em uso.'));
      const res = await agent.put('/api/users/me/username').send({ nome: 'bia' });
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Esse nome de usuário já está em uso.');
    });
  });

  describe('sem nome de usuário', () => {
    it('bloqueia o resto do app com 403 até escolher o nome', async () => {
      const novo = await agentWithoutUsername(app, deps);
      const bloqueio = { error: 'Escolha um nome de usuário para continuar.' };

      for (const [method, path] of [
        ['get', '/api/posts?feed=foryou'],
        ['post', '/api/posts/1/like'],
        ['get', '/api/users/2'],
        ['post', '/api/users/2/follow'],
        ['put', '/api/users/me'],
        ['get', '/api/notifications/unread-count'],
        ['get', '/api/music/search?q=x'],
      ]) {
        const res = await novo[method](path);
        expect([method, path, res.status, res.body]).toEqual([method, path, 403, bloqueio]);
      }
      expect(deps.postService.forYou).not.toHaveBeenCalled();
    });

    it('continua podendo consultar a sessão e sair', async () => {
      const novo = await agentWithoutUsername(app, deps);
      await novo.get('/api/auth/me').expect(200);
      await novo.post('/api/auth/logout').expect(204);
    });
  });
});
