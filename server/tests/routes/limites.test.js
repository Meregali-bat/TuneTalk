import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildTestApp, loggedAgent } from '../helpers/buildTestApp.js';
import { createLimitador, createMemoryStore } from '../../src/security/limitador.js';
import { LIMITES } from '../../src/http/limites.js';

const comLimites = (overrides = {}) =>
  buildTestApp({ limitador: createLimitador({ store: createMemoryStore() }), ...overrides });

describe('limite de requisições nas rotas', () => {
  it('login: depois do máximo para o mesmo email, responde 429; outro email ainda entra', async () => {
    const { app } = comLimites();
    for (let i = 0; i < LIMITES.login.max; i += 1) {
      await request(app).post('/api/auth/login').send({ email: 'Ana@x.com ', senha: 'errada' }).expect(200);
    }
    const res = await request(app).post('/api/auth/login').send({ email: 'ana@x.com', senha: 'errada' });
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/Muitas tentativas/);
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);

    await request(app).post('/api/auth/login').send({ email: 'bia@x.com', senha: 'x' }).expect(200);
  });

  it('cadastro: limite por ip', async () => {
    const { app, deps } = comLimites();
    deps.authService.register.mockResolvedValue({ id: 2, nome: null, email: 'n@x.com' });
    for (let i = 0; i < LIMITES.cadastro.max; i += 1) {
      await request(app).post('/api/auth/register').send({ email: `n${i}@x.com`, senha: 'Senha!1' }).expect(201);
    }
    await request(app).post('/api/auth/register').send({ email: 'mais@x.com', senha: 'Senha!1' }).expect(429);
    expect(deps.authService.register).toHaveBeenCalledTimes(LIMITES.cadastro.max);
  });

  it('curtidas: limite por usuário, sem chamar o serviço depois do máximo', async () => {
    const { app, deps } = comLimites();
    deps.postService.like.mockResolvedValue(1);
    const agent = await loggedAgent(app);
    for (let i = 0; i < LIMITES.interacao.max; i += 1) await agent.post('/api/posts/1/like').expect(200);
    await agent.post('/api/posts/1/like').expect(429);
    expect(deps.postService.like).toHaveBeenCalledTimes(LIMITES.interacao.max);
  });

  it('trocar senha (que confere a senha atual) tem limite próprio', async () => {
    const { app, deps } = comLimites();
    const agent = await loggedAgent(app);
    for (let i = 0; i < LIMITES.senhaAtual.max; i += 1) {
      await agent.put('/api/users/me/password').send({ senhaAtual: 'x', novaSenha: 'Senha!2' }).expect(204);
    }
    await agent.put('/api/users/me/password').send({ senhaAtual: 'x', novaSenha: 'Senha!2' }).expect(429);
    expect(deps.userService.changePassword).toHaveBeenCalledTimes(LIMITES.senhaAtual.max);
  });

  it('sem limitador (como nos outros testes), nada é limitado', async () => {
    const { app } = buildTestApp();
    for (let i = 0; i < LIMITES.login.max + 2; i += 1) {
      await request(app).post('/api/auth/login').send({ email: 'ana@x.com', senha: 'x' }).expect(200);
    }
  });
});
