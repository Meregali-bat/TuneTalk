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
      deps.authService.register.mockResolvedValue({ id: 5, nome: 'Bia', email: 'bia@x.com' });
    });

    it('cadastra com foto padrão quando não há imagem e já loga', async () => {
      const agent = request.agent(app);
      const res = await agent
        .post('/api/auth/register')
        .field('nome', 'Bia')
        .field('email', 'bia@x.com')
        .field('senha', 'Senha!1');

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: 5, nome: 'Bia', email: 'bia@x.com' });
      expect(deps.authService.register).toHaveBeenCalledWith({
        nome: 'Bia',
        email: 'bia@x.com',
        senha: 'Senha!1',
        fotoPerfil: 'default.png',
      });
      expect(deps.uploader.upload).not.toHaveBeenCalled();
      await agent.get('/api/auth/me').expect(200);
    });

    it('envia a imagem para o uploader e usa a URL devolvida', async () => {
      deps.uploader.upload.mockResolvedValue('https://cdn/foto.png');
      const res = await request(app)
        .post('/api/auth/register')
        .field('nome', 'Bia')
        .field('email', 'bia@x.com')
        .field('senha', 'Senha!1')
        .attach('imagem', Buffer.from('fake-image'), 'foto.png');

      expect(res.status).toBe(201);
      expect(deps.uploader.upload).toHaveBeenCalledWith(expect.any(Buffer));
      expect(deps.authService.register.mock.calls[0][0].fotoPerfil).toBe('https://cdn/foto.png');
    });

    it('propaga erros de validação', async () => {
      deps.authService.register.mockRejectedValue(new HttpError(409, 'Já existe um usuário com o mesmo nome ou email'));
      const res = await request(app).post('/api/auth/register').field('nome', 'Bia');
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Já existe um usuário com o mesmo nome ou email');
    });
  });
});
