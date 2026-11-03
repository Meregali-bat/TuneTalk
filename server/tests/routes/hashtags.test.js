import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildTestApp, loggedAgent } from '../helpers/buildTestApp.js';

describe('rotas /api/hashtags', () => {
  let app;
  let deps;
  let agent;

  beforeEach(async () => {
    ({ app, deps } = buildTestApp());
    agent = await loggedAgent(app);
  });

  it('exige login', async () => {
    await request(app).get('/api/hashtags/em-alta').expect(401);
  });

  it('GET /api/hashtags/em-alta devolve as hashtags do momento', async () => {
    deps.hashtagService.trending.mockResolvedValue([{ tag: 'guts', posts: 3 }]);
    expect((await agent.get('/api/hashtags/em-alta')).body).toEqual([{ tag: 'guts', posts: 3 }]);
  });

  it('GET /api/hashtags?q= busca hashtags', async () => {
    deps.hashtagService.search.mockResolvedValue([{ tag: 'guts', posts: 2 }]);
    expect((await agent.get('/api/hashtags?q=%23gu')).body).toEqual([{ tag: 'guts', posts: 2 }]);
    expect(deps.hashtagService.search).toHaveBeenCalledWith('#gu');
  });
});
