import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import session from 'express-session';
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

  describe('sessão', () => {
    it('fica no store injetado (em produção, o Postgres) e sobrevive a outra instância do app', async () => {
      const sessionStore = new session.MemoryStore();
      const primeira = buildTestApp({ sessionStore });
      const res = await request(primeira.app).post('/api/auth/login').send({ email: 'ana@x.com', senha: 'Senha!1' });
      const cookie = res.headers['set-cookie'];

      expect(Object.keys(sessionStore.sessions)).toHaveLength(1);
      const outra = buildTestApp({ sessionStore });
      const me = await request(outra.app).get('/api/auth/me').set('Cookie', cookie);
      expect(me.body).toEqual(sessionUser);
    });

    it('o cookie dura 30 dias, é httpOnly e sameSite=lax', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'ana@x.com', senha: 'Senha!1' });
      const [cookie] = res.headers['set-cookie'];
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Lax/);
      const expires = Date.parse(cookie.match(/Expires=([^;]+)/)[1]);
      expect(expires - Date.now()).toBeGreaterThan(29 * 24 * 60 * 60 * 1000);
    });

    it('atrás de HTTPS (secureCookies) confia no proxy e marca o cookie como Secure', async () => {
      const { app: seguro } = buildTestApp({ secureCookies: true });
      const res = await request(seguro).post('/api/auth/login')
        .set('X-Forwarded-Proto', 'https')
        .send({ email: 'ana@x.com', senha: 'Senha!1' });
      expect(res.headers['set-cookie'][0]).toMatch(/Secure/);
    });
  });

  describe('esqueci minha senha', () => {
    it('POST /api/auth/forgot-password responde 204 sempre (exista a conta ou não)', async () => {
      deps.passwordResetService.request.mockResolvedValue(undefined);
      await request(app).post('/api/auth/forgot-password').send({ email: 'ana@x.com' }).expect(204);
      expect(deps.passwordResetService.request).toHaveBeenCalledWith('ana@x.com');
    });

    it('POST /api/auth/reset-password troca a senha com o código do link', async () => {
      deps.passwordResetService.reset.mockResolvedValue(undefined);
      await request(app).post('/api/auth/reset-password').send({ token: 'abc', novaSenha: 'Nova!123' }).expect(204);
      expect(deps.passwordResetService.reset).toHaveBeenCalledWith('abc', 'Nova!123');
    });

    it('repassa o erro de link inválido', async () => {
      deps.passwordResetService.reset.mockRejectedValue(new HttpError(400, 'Este link é inválido ou já expirou. Peça um novo.'));
      const res = await request(app).post('/api/auth/reset-password').send({ token: 'x', novaSenha: 'Nova!123' });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Este link é inválido ou já expirou. Peça um novo.' });
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
