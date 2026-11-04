import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildTestApp, loggedAgent } from '../helpers/buildTestApp.js';

describe('rotas /api/quero-ouvir', () => {
  let app;
  let deps;
  let agent;

  beforeEach(async () => {
    ({ app, deps } = buildTestApp());
    agent = await loggedAgent(app);
  });

  it('exige login', async () => {
    await request(app).get('/api/quero-ouvir').expect(401);
  });

  it('lista, adiciona e remove para quem está logado', async () => {
    deps.queroOuvirService.listar.mockResolvedValue([{ id: 1 }]);
    deps.queroOuvirService.adicionar.mockResolvedValue({ id: 2 });

    expect((await agent.get('/api/quero-ouvir').expect(200)).body).toEqual([{ id: 1 }]);
    const disco = { tipo: 'album', titulo: 'Abbey Road', artista: 'The Beatles' };
    expect((await agent.post('/api/quero-ouvir').send(disco).expect(201)).body).toEqual({ id: 2 });
    await agent.delete('/api/quero-ouvir?tipo=album&titulo=Abbey%20Road&artista=The%20Beatles').expect(204);

    expect(deps.queroOuvirService.listar).toHaveBeenCalledWith(1);
    expect(deps.queroOuvirService.adicionar).toHaveBeenCalledWith(1, disco);
    expect(deps.queroOuvirService.remover).toHaveBeenCalledWith(1, disco);
  });
});
