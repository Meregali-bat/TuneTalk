import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import session from 'express-session';
import { createAuthRoutes } from './http/authRoutes.js';
import { createPostRoutes } from './http/postRoutes.js';
import { createUserRoutes } from './http/userRoutes.js';
import { createNotificationRoutes } from './http/notificationRoutes.js';
import { createMusicRoutes } from './http/musicRoutes.js';
import { createHashtagRoutes } from './http/hashtagRoutes.js';
import { apiNotFound, errorHandler } from './http/middlewares.js';

const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

/**
 * Monta a aplicação Express. Todas as dependências são injetadas para que
 * as rotas possam ser testadas sem banco de dados nem serviços externos.
 */
export function createApp(deps) {
  const app = express();
  // Atrás de HTTPS (Vercel ou proxy) o Express precisa confiar no proxy para enviar o cookie Secure.
  if (deps.secureCookies) app.set('trust proxy', 1);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(session({
    // Sem store, o express-session usa memória (testes e desenvolvimento).
    store: deps.sessionStore,
    secret: deps.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: deps.secureCookies ?? false, maxAge: SESSION_MAX_AGE },
  }));

  const api = express.Router();
  api.use('/auth', createAuthRoutes(deps));
  api.use('/posts', createPostRoutes(deps));
  api.use('/users', createUserRoutes(deps));
  api.use('/notifications', createNotificationRoutes(deps));
  api.use('/music', createMusicRoutes(deps));
  api.use('/hashtags', createHashtagRoutes(deps));
  api.use(apiNotFound);
  app.use('/api', api);

  // Em produção o Express também entrega o build do React (SPA).
  if (deps.clientDist && fs.existsSync(deps.clientDist)) {
    app.use(express.static(deps.clientDist));
    app.get('*', (req, res) => res.sendFile(path.join(deps.clientDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
