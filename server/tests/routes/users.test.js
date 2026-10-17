import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildTestApp, loggedAgent } from '../helpers/buildTestApp.js';

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
});
