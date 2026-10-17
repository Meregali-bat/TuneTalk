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

  it('GET /api/users/:id devolve o perfil visto pelo usuário logado', async () => {
    deps.userService.getProfile.mockResolvedValue({ usuario: { id: 2 } });
    const res = await agent.get('/api/users/2');
    expect(res.body).toEqual({ usuario: { id: 2 } });
    expect(deps.userService.getProfile).toHaveBeenCalledWith(2, 1);
  });

  describe('PUT /api/users/me', () => {
    it('atualiza nome e bio sem foto nova', async () => {
      deps.userService.updateProfile.mockResolvedValue({ id: 1, nome: 'Novo' });
      const res = await agent.put('/api/users/me').field('nome', 'Novo').field('bio', 'bio');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 1, nome: 'Novo' });
      expect(deps.userService.updateProfile).toHaveBeenCalledWith(1, { nome: 'Novo', bio: 'bio', fotoPerfil: undefined });
    });

    it('envia a foto nova para o uploader', async () => {
      deps.uploader.upload.mockResolvedValue('https://cdn/nova.png');
      deps.userService.updateProfile.mockResolvedValue({ id: 1 });
      await agent.put('/api/users/me').field('nome', 'N').attach('foto', Buffer.from('img'), 'nova.png').expect(200);
      expect(deps.userService.updateProfile.mock.calls[0][1].fotoPerfil).toBe('https://cdn/nova.png');
    });

    it('mantém o nome da sessão atualizado', async () => {
      deps.userService.updateProfile.mockResolvedValue({ id: 1, nome: 'Novo' });
      await agent.put('/api/users/me').field('nome', 'Novo');
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
