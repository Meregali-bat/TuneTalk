import { Router } from 'express';
import { asyncRoute, requireAuth } from './middlewares.js';

export function createAuthRoutes({ authService, passwordResetService, defaultProfilePhoto }) {
  const router = Router();

  const startSession = (req, user) =>
    new Promise((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) return reject(err);
        req.session.user = user;
        resolve();
      });
    });

  router.get('/me', requireAuth, (req, res) => {
    res.json(req.session.user);
  });

  // "Manter conectado" (padrão): o login dura 30 dias. Desmarcado: o cookie vale só até fechar o
  // navegador (e o servidor esquece a sessão depois de um tempo parado).
  router.post('/login', asyncRoute(async (req, res) => {
    const user = await authService.login(req.body.email, req.body.senha);
    await startSession(req, user);
    if (req.body.manterConectado === false) req.session.cookie.maxAge = null;
    res.json(user);
  }));

  router.post('/logout', (req, res, next) => {
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('connect.sid').status(204).end();
    });
  });

  router.post('/register', asyncRoute(async (req, res) => {
    const { email, senha } = req.body;
    const user = await authService.register({ email, senha, fotoPerfil: defaultProfilePhoto });
    await startSession(req, user);
    res.status(201).json(user);
  }));

  router.post('/forgot-password', asyncRoute(async (req, res) => {
    await passwordResetService.request(req.body.email);
    res.status(204).end();
  }));

  router.post('/reset-password', asyncRoute(async (req, res) => {
    await passwordResetService.reset(req.body.token, req.body.novaSenha);
    res.status(204).end();
  }));

  return router;
}
