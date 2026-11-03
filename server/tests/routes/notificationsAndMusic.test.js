import { describe, it, expect, beforeEach, vi } from 'vitest';
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

  it('GET /api/music/preview devolve um link novo da prévia (404 se não achar)', async () => {
    deps.musicService.preview = vi.fn().mockResolvedValueOnce('novo.mp3').mockResolvedValueOnce(null);
    const res = await agent.get('/api/music/preview?titulo=Help!&artista=The%20Beatles');
    expect(res.body).toEqual({ preview: 'novo.mp3' });
    expect(deps.musicService.preview).toHaveBeenCalledWith('Help!', 'The Beatles');
    await agent.get('/api/music/preview?titulo=x&artista=y').expect(404);
  });

  describe('GET /api/music/lyrics', () => {
    it('devolve os versos da letra', async () => {
      deps.lyricsService.letra.mockResolvedValue({ versos: ['um', 'dois'] });
      const res = await agent.get('/api/music/lyrics?titulo=Help!&artista=The%20Beatles&duracao=138').expect(200);
      expect(res.body).toEqual({ versos: ['um', 'dois'] });
      expect(deps.lyricsService.letra).toHaveBeenCalledWith('Help!', 'The Beatles', '138');
    });

    it('responde 404 quando a música não tem letra', async () => {
      deps.lyricsService.letra.mockResolvedValue(null);
      const res = await agent.get('/api/music/lyrics?titulo=x&artista=y').expect(404);
      expect(res.body).toEqual({ error: 'Letra não encontrada.' });
    });

    it('responde 503 (e não derruba nada) quando a base de letras falha', async () => {
      const { letrasIndisponiveis } = await import('../../src/services/lyricsService.js');
      deps.lyricsService.letra.mockRejectedValue(letrasIndisponiveis());
      const res = await agent.get('/api/music/lyrics?titulo=x&artista=y').expect(503);
      expect(res.body).toEqual({ error: 'Não foi possível carregar a letra agora.' });
      await agent.get('/api/notifications/unread-count').expect(200);
    });
  });

  it('GET /api/music/search busca músicas', async () => {
    deps.musicService.search.mockResolvedValue([{ id: 1, titulo: 'Help!' }]);
    const res = await agent.get('/api/music/search?q=help');
    expect(res.body).toEqual([{ id: 1, titulo: 'Help!' }]);
    expect(deps.musicService.search).toHaveBeenCalledWith('help', 'musica');

    await agent.get('/api/music/search?q=abbey&tipo=album');
    expect(deps.musicService.search).toHaveBeenLastCalledWith('abbey', 'album');
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
