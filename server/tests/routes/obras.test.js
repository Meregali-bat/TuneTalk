import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { buildTestApp, loggedAgent } from '../helpers/buildTestApp.js';

describe('rotas /api/obras', () => {
  let app;
  let deps;
  let agent;

  beforeEach(async () => {
    ({ app, deps } = buildTestApp());
    deps.postService.obra = vi.fn().mockResolvedValue({ obra: { titulo: 'Help!' }, posts: [] });
    agent = await loggedAgent(app);
  });

  it('exige login', async () => {
    await request(app).get('/api/obras/album?titulo=x&artista=y').expect(401);
  });

  it('busca a obra pelo tipo, título e artista', async () => {
    const res = await agent.get('/api/obras/musica?titulo=Help!&artista=The%20Beatles').expect(200);
    expect(res.body).toEqual({ obra: { titulo: 'Help!' }, posts: [] });
    expect(deps.postService.obra).toHaveBeenCalledWith(1, { tipo: 'musica', titulo: 'Help!', artista: 'The Beatles' }, undefined);
  });

  it('repassa a página seguinte', async () => {
    await agent.get('/api/obras/album?titulo=A&artista=B&antes=2024-01-01T00%3A00%3A00.000Z&antesId=3').expect(200);
    expect(deps.postService.obra).toHaveBeenCalledWith(1, { tipo: 'album', titulo: 'A', artista: 'B' }, { antes: '2024-01-01T00:00:00.000Z', antesId: '3' });
  });

  it('outro tipo não existe', async () => {
    await agent.get('/api/obras/artista?titulo=x&artista=y').expect(404);
  });
});
