import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildTestApp, loggedAgent } from '../helpers/buildTestApp.js';

describe('rotas /api/notifications e /api/music', () => {
  let app;
  let deps;
  let agent;

  beforeEach(async () => {
    ({ app, deps } = buildTestApp());
    agent = await loggedAgent(app);
  });

  it('exigem autenticação', async () => {
    await request(app).get('/api/notifications').expect(401);
    await request(app).get('/api/music/search?q=x').expect(401);
  });

  it('GET /api/notifications lista as notificações do usuário', async () => {
    deps.notifications.listForUser.mockResolvedValue([{ id: 1 }]);
    const res = await agent.get('/api/notifications');
    expect(res.body).toEqual([{ id: 1 }]);
    expect(deps.notifications.listForUser).toHaveBeenCalledWith(1);
  });

  it('GET /api/notifications/unread-count devolve o total não lido', async () => {
    deps.notifications.countUnread.mockResolvedValue(3);
    const res = await agent.get('/api/notifications/unread-count');
    expect(res.body).toEqual({ count: 3 });
  });

  it('POST /api/notifications/read-all marca tudo como lido', async () => {
    await agent.post('/api/notifications/read-all').expect(204);
    expect(deps.notifications.markAllRead).toHaveBeenCalledWith(1);
  });

  it('GET /api/music/search busca músicas', async () => {
    deps.musicService.search.mockResolvedValue([{ id: 1, titulo: 'Help!' }]);
    const res = await agent.get('/api/music/search?q=help');
    expect(res.body).toEqual([{ id: 1, titulo: 'Help!' }]);
    expect(deps.musicService.search).toHaveBeenCalledWith('help');
  });

  it('rotas /api desconhecidas respondem 404 em JSON', async () => {
    const res = await agent.get('/api/nao-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Rota não encontrada.' });
  });

  describe('erros do Prisma', () => {
    const prismaError = (code) => Object.assign(new Error(`prisma ${code}`), { name: 'PrismaClientKnownRequestError', code });

    it('violação de unicidade (P2002) vira 409', async () => {
      deps.notifications.markAllRead.mockRejectedValue(prismaError('P2002'));
      const res = await agent.post('/api/notifications/read-all');
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'Registro duplicado.' });
    });

    it('registro inexistente (P2025) vira 404', async () => {
      deps.notifications.markAllRead.mockRejectedValue(prismaError('P2025'));
      const res = await agent.post('/api/notifications/read-all');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Não encontrado.' });
    });
  });
});
