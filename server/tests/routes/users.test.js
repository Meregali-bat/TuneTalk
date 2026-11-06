import { describe, it, expect, beforeEach, vi } from 'vitest';
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

  it('GET /api/users/by-name/:nome abre o perfil pelo @', async () => {
    deps.userService.getProfileByName.mockResolvedValue({ usuario: { id: 2 } });
    const res = await agent.get('/api/users/by-name/bia.souza');
    expect(res.body).toEqual({ usuario: { id: 2 } });
    expect(deps.userService.getProfileByName).toHaveBeenCalledWith('bia.souza', 1);
  });

  it('GET /api/users/:id/comentarios lista os comentários da pessoa', async () => {
    deps.postService.repliesByAuthor = vi.fn().mockResolvedValue([{ id: 9 }]);
    const res = await agent.get('/api/users/2/comentarios');
    expect(res.body).toEqual([{ id: 9 }]);
    expect(deps.postService.repliesByAuthor).toHaveBeenCalledWith(2, 1);
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

  it('PUT /api/users/me/favoritos salva os favoritos de quem está logado', async () => {
    deps.userService.updateFavorites = vi.fn().mockResolvedValue({ musicas: [], albuns: [], artistas: [] });
    const res = await agent.put('/api/users/me/favoritos').send({ musicas: [] }).expect(200);
    expect(res.body).toEqual({ musicas: [], albuns: [], artistas: [] });
    expect(deps.userService.updateFavorites).toHaveBeenCalledWith(1, { musicas: [] });
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

  it('GET e POST /api/users/me/presente consultam e abrem o presente dos 100 posts', async () => {
    deps.userService.presente = vi.fn().mockResolvedValue({ pendente: true });
    deps.userService.abrirPresente = vi.fn();
    await agent.get('/api/users/me/presente').expect(200, { pendente: true });
    await agent.post('/api/users/me/presente').expect(204);
    expect(deps.userService.abrirPresente).toHaveBeenCalledWith(1);
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
        nome: 'ana', bio: undefined, nomeExibicao: 'Ana Souza', fotoPerfil: undefined, bannerUrl: banner, mostrarSeloFundador: undefined,
      });
    });

    it('repassa a escolha de mostrar a medalha de fundador', async () => {
      deps.userService.updateProfile.mockResolvedValue({ id: 1 });
      await agent.put('/api/users/me').send({ nome: 'ana', mostrarSeloFundador: false }).expect(200);
      expect(deps.userService.updateProfile.mock.calls[0][1].mostrarSeloFundador).toBe(false);
    });

    it('repassa a escolha do efeito do perfil', async () => {
      deps.userService.updateProfile.mockResolvedValue({ id: 1 });
      const efeitoPerfil = { tipo: 'cd', paleta: 'sol' };
      await agent.put('/api/users/me').send({ nome: 'ana', efeitoPerfil, mostrarEfeito: true }).expect(200);
      expect(deps.userService.updateProfile.mock.calls[0][1]).toMatchObject({ efeitoPerfil, mostrarEfeito: true });
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

  it('GET /sugestoes traz as sugestões de quem seguir para quem está logado', async () => {
    deps.sugestaoService.listar.mockResolvedValue([{ usuario: { id: 2 }, motivo: 'x' }]);
    const agent = await loggedAgent(app);
    const res = await agent.get('/api/users/sugestoes').expect(200);
    expect(res.body).toEqual([{ usuario: { id: 2 }, motivo: 'x' }]);
    expect(deps.sugestaoService.listar).toHaveBeenCalledWith(1);
  });

  it('PUT /me/email troca o email e atualiza a sessão', async () => {
    deps.userService.changeEmail.mockResolvedValue({ email: 'novo@x.com' });
    const agent = await loggedAgent(app);
    const res = await agent.put('/api/users/me/email').send({ senhaAtual: 'Senha!1', novoEmail: 'novo@x.com' }).expect(200);
    expect(res.body).toMatchObject({ id: 1, email: 'novo@x.com' });
    expect(deps.userService.changeEmail).toHaveBeenCalledWith(1, 'Senha!1', 'novo@x.com');
    expect((await agent.get('/api/auth/me').expect(200)).body.email).toBe('novo@x.com');
  });

  describe('bloquear e silenciar', () => {
    it('POST faz e DELETE desfaz, sempre para quem está logado', async () => {
      const agent = await loggedAgent(app);
      await agent.post('/api/users/2/bloqueio').expect(204);
      await agent.delete('/api/users/2/bloqueio').expect(204);
      await agent.post('/api/users/2/silencio').expect(204);
      await agent.delete('/api/users/2/silencio').expect(204);
      expect(deps.restricaoService.bloquear).toHaveBeenCalledWith(1, 2);
      expect(deps.restricaoService.desbloquear).toHaveBeenCalledWith(1, 2);
      expect(deps.restricaoService.silenciar).toHaveBeenCalledWith(1, 2);
      expect(deps.restricaoService.dessilenciar).toHaveBeenCalledWith(1, 2);
    });

    it('GET /me/restricoes lista quem a pessoa bloqueou e silenciou', async () => {
      deps.restricaoService.listar.mockResolvedValue({ bloqueados: [{ id: 2 }], silenciados: [] });
      const agent = await loggedAgent(app);
      const res = await agent.get('/api/users/me/restricoes').expect(200);
      expect(res.body).toEqual({ bloqueados: [{ id: 2 }], silenciados: [] });
      expect(deps.restricaoService.listar).toHaveBeenCalledWith(1);
    });

    it('exige login', async () => {
      await request(app).post('/api/users/2/bloqueio').expect(401);
    });
  });
});
