import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildTestApp, loggedAgent } from '../helpers/buildTestApp.js';

describe('rotas /api/push', () => {
  let app;
  let deps;
  let agent;

  beforeEach(async () => {
    ({ app, deps } = buildTestApp());
    agent = await loggedAgent(app);
  });

  it('GET /chave é pública e devolve a chave (ou null se desligado)', async () => {
    expect((await request(app).get('/api/push/chave').expect(200)).body).toEqual({ chave: 'chave-publica' });
    deps.pushService.chavePublica.mockReturnValue(null);
    expect((await request(app).get('/api/push/chave')).body).toEqual({ chave: null });
  });

  it('inscrever e cancelar exigem login', async () => {
    await request(app).post('/api/push/inscricoes').send({}).expect(401);
    const corpo = { endpoint: 'https://push.example/a', keys: { p256dh: 'p', auth: 'a' } };
    await agent.post('/api/push/inscricoes').send(corpo).expect(204);
    expect(deps.pushService.inscrever).toHaveBeenCalledWith(1, corpo);
    await agent.delete('/api/push/inscricoes').send({ endpoint: 'https://push.example/a' }).expect(204);
    expect(deps.pushService.cancelar).toHaveBeenCalledWith(1, 'https://push.example/a');
  });
});
