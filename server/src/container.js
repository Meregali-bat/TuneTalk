import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import { createPool, createPrismaClient } from './infra/prisma.js';
import { createSessionCleaner, createSessionStore } from './infra/sessionStore.js';
import { createPasswords } from './security/passwords.js';
import { createLimitador, createPostgresStore } from './security/limitador.js';
import { createConsoleMailer, createResendMailer } from './infra/mailer.js';
import { createPasswordResetRepository } from './repositories/passwordResetRepository.js';
import { createPasswordResetService } from './services/passwordResetService.js';
import { createCloudinaryUploader } from './infra/cloudinaryUploader.js';
import { createUserRepository } from './repositories/userRepository.js';
import { createPostRepository } from './repositories/postRepository.js';
import { createLikeRepository } from './repositories/likeRepository.js';
import { createFollowRepository } from './repositories/followRepository.js';
import { createNotificationRepository } from './repositories/notificationRepository.js';
import { createAuthService } from './services/authService.js';
import { createPostService } from './services/postService.js';
import { createUserService } from './services/userService.js';
import { createMusicService } from './services/musicService.js';
import { createGifService } from './services/gifService.js';
import { createLyricsService } from './services/lyricsService.js';
import { createHashtagService } from './services/hashtagService.js';
import webpush from 'web-push';
import { createPushSubscriptionRepository } from './repositories/pushSubscriptionRepository.js';
import { createPushService, withPush } from './services/pushService.js';
import { renderizarImagem } from './share/postCard.js';
import { createRestricaoRepository } from './repositories/restricaoRepository.js';
import { createQueroOuvirRepository } from './repositories/queroOuvirRepository.js';
import { createQueroOuvirService } from './services/queroOuvirService.js';
import { createSugestaoRepository } from './repositories/sugestaoRepository.js';
import { createSugestaoService } from './services/sugestaoService.js';
import { createRestricaoService, semNotificacaoDeOcultos } from './services/restricaoService.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// index.html do build do React, onde entram as tags do post compartilhado. Na Vercel ele vai junto
// da função (includeFiles no vercel.json); se faltar, é buscado do próprio site.
function createIndexLoader(appUrl) {
  let cache;
  return async () => {
    if (cache) return cache;
    try {
      cache = await fs.readFile(path.join(rootDir, 'dist', 'index.html'), 'utf8');
    } catch {
      const resposta = await fetch(`${appUrl}/index.html`, { signal: AbortSignal.timeout(4000) });
      if (!resposta.ok) throw new Error(`index.html indisponível (${resposta.status}).`);
      cache = await resposta.text();
    }
    return cache;
  };
}

// Composição real das dependências (Postgres via Prisma, Cloudinary, Deezer).
export function buildContainer(config) {
  const pool = createPool(config.databaseUrl);
  const prisma = createPrismaClient(pool);
  cloudinary.config(config.cloudinary);

  const users = createUserRepository(prisma);
  const posts = createPostRepository(prisma);
  const likes = createLikeRepository(prisma);
  const follows = createFollowRepository(prisma);
  const pushService = createPushService({
    subscriptions: createPushSubscriptionRepository(prisma), webpush, vapid: config.vapid,
  });
  const restricoes = createRestricaoRepository(prisma);
  const queroOuvir = createQueroOuvirRepository(prisma);
  // Toda notificação criada também vira aviso no celular de quem ativou, menos as de quem a
  // pessoa silenciou ou bloqueou.
  const notifications = semNotificacaoDeOcultos(
    withPush(createNotificationRepository(prisma), { push: pushService, users }),
    restricoes,
  );

  const passwords = createPasswords();
  const limitador = createLimitador({ store: createPostgresStore(pool) });
  // Curtir/descurtir ou seguir/deixar de seguir em loop não pode virar uma chuva de avisos.
  const avisarUmaVez = (chave) => limitador.primeiraVez(`aviso:${chave}`, 24 * 60 * 60);
  const sessions = createSessionCleaner(pool);
  const mailer = config.resendApiKey
    ? createResendMailer({ apiKey: config.resendApiKey, from: config.emailFrom })
    : createConsoleMailer();
  const postService = createPostService({ posts, likes, notifications, users, restricoes, queroOuvir, avisarUmaVez });

  return {
    authService: createAuthService({ users, passwords, notifications }),
    passwordResetService: createPasswordResetService({
      users, resets: createPasswordResetRepository(prisma), passwords, mailer, sessions, appUrl: config.appUrl,
    }),
    postService,
    userService: createUserService({ users, follows, postService, notifications, passwords, restricoes, mailer, avisarUmaVez }),
    restricaoService: createRestricaoService({ restricoes, users }),
    queroOuvirService: createQueroOuvirService({ queroOuvir }),
    sugestaoService: createSugestaoService({ sugestoes: createSugestaoRepository(prisma), follows, restricoes }),
    musicService: createMusicService(),
    gifService: createGifService({ apiKey: config.giphyApiKey }),
    lyricsService: createLyricsService(),
    hashtagService: createHashtagService({ posts }),
    pushService,
    notifications,
    uploader: createCloudinaryUploader(cloudinary),
    sessionStore: createSessionStore(pool),
    sessions,
    limitador,
    sessionSecret: config.sessionSecret,
    appUrl: config.appUrl,
    secureCookies: config.secureCookies,
    defaultProfilePhoto: config.defaultProfilePhoto,
    sharePreview: {
      appUrl: config.appUrl,
      findPost: (id) => posts.findById(id),
      carregarIndex: createIndexLoader(config.appUrl),
      renderizarImagem,
    },
    clientDist: config.serveClient ? path.join(rootDir, 'dist') : undefined,
  };
}
