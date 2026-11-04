import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildTestApp, loggedAgent } from '../helpers/buildTestApp.js';

describe('rota /api/gifs', () => {
  it('exige autenticação', async () => {
    const { app } = buildTestApp();
    await request(app).get('/api/gifs?q=x').expect(401);
  });

  it('busca GIFs pelo termo', async () => {
    const { app, deps } = buildTestApp();
    deps.gifService.search.mockResolvedValue([{ id: 'abc' }]);
    const agent = await loggedAgent(app);
    const res = await agent.get('/api/gifs?q=dança').expect(200);
    expect(res.body).toEqual([{ id: 'abc' }]);
    expect(deps.gifService.search).toHaveBeenCalledWith('dança');
  });
});
