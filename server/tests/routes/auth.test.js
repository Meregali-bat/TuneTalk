import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildTestApp, loggedAgent, sessionUser } from '../helpers/buildTestApp.js';
import { HttpError } from '../../src/errors.js';

describe('rotas /api/auth', () => {
  let app;
  let deps;

  beforeEach(() => {
    ({ app, deps } = buildTestApp());
  });

  describe('GET /api/auth/me', () => {
    it('responde 401 sem sessão', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Não autenticado.' });
    });

    it('devolve o usuário logado', async () => {
      const agent = await loggedAgent(app);
      const res = await agent.get('/api/auth/me');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(sessionUser);
    });
  });

  describe('POST /api/auth/login', () => {
    it('autentica e abre a sessão', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'ana@x.com', senha: 'Senha!1' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual(sessionUser);
      expect(deps.authService.login).toHaveBeenCalledWith('ana@x.com', 'Senha!1');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('propaga o erro de credenciais', async () => {
      deps.authService.login.mockRejectedValue(new HttpError(401, 'Usuário ou senha incorretos.'));
      const res = await request(app).post('/api/auth/login').send({ email: 'a', senha: 'b' });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Usuário ou senha incorretos.' });
    });
  });

  it('POST /api/auth/logout encerra a sessão', async () => {
    const agent = await loggedAgent(app);
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
  });

  describe('POST /api/auth/register', () => {
    beforeEach(() => {
      deps.authService.register.mockResolvedValue({ id: 5, nome: null, email: 'bia@x.com' });
    });

    it('cria a conta só com email e senha (foto padrão) e já abre a sessão', async () => {
      const agent = request.agent(app);
      const res = await agent.post('/api/auth/register').send({ email: 'bia@x.com', senha: 'Senha!1' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: 5, nome: null, email: 'bia@x.com' });
      expect(deps.authService.register).toHaveBeenCalledWith({
        email: 'bia@x.com',
        senha: 'Senha!1',
        fotoPerfil: 'default.png',
      });
      expect((await agent.get('/api/auth/me')).body).toEqual({ id: 5, nome: null, email: 'bia@x.com' });
    });

    it('propaga erros de validação', async () => {
      deps.authService.register.mockRejectedValue(new HttpError(409, 'Já existe uma conta com esse email.'));
      const res = await request(app).post('/api/auth/register').send({ email: 'bia@x.com', senha: 'Senha!1' });
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Já existe uma conta com esse email.');
    });
  });
});
