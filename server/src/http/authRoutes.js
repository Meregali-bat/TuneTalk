import { Router } from 'express';
import { asyncRoute, imageUpload, requireAuth, uploadedImageUrl } from './middlewares.js';

export function createAuthRoutes({ authService, uploader, defaultProfilePhoto }) {
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

  router.post('/login', asyncRoute(async (req, res) => {
    const user = await authService.login(req.body.email, req.body.senha);
    await startSession(req, user);
    res.json(user);
  }));

  router.post('/logout', (req, res, next) => {
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('connect.sid').status(204).end();
    });
  });

  router.post('/register', imageUpload.single('imagem'), asyncRoute(async (req, res) => {
    const { nome, email, senha } = req.body;
    const fotoPerfil = (await uploadedImageUrl(uploader, req.file)) ?? defaultProfilePhoto;
    const user = await authService.register({ nome, email, senha, fotoPerfil });
    await startSession(req, user);
    res.status(201).json(user);
  }));

  return router;
}
