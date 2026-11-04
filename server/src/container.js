import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import { createPool, createPrismaClient } from './infra/prisma.js';
import { createSessionCleaner, createSessionStore } from './infra/sessionStore.js';
import { createPasswords } from './security/passwords.js';
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
import { createLyricsService } from './services/lyricsService.js';
import { createHashtagService } from './services/hashtagService.js';
import webpush from 'web-push';
import { createPushSubscriptionRepository } from './repositories/pushSubscriptionRepository.js';
import { createPushService, withPush } from './services/pushService.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

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
  // Toda notificação criada também vira aviso no celular de quem ativou.
  const notifications = withPush(createNotificationRepository(prisma), { push: pushService, users });

  const passwords = createPasswords();
  const sessions = createSessionCleaner(pool);
  const mailer = config.resendApiKey
    ? createResendMailer({ apiKey: config.resendApiKey, from: config.emailFrom })
    : createConsoleMailer();
  const postService = createPostService({ posts, likes, notifications, users });

  return {
    authService: createAuthService({ users, passwords, notifications }),
    passwordResetService: createPasswordResetService({
      users, resets: createPasswordResetRepository(prisma), passwords, mailer, sessions, appUrl: config.appUrl,
    }),
    postService,
    userService: createUserService({ users, follows, postService, notifications, passwords }),
    musicService: createMusicService(),
    lyricsService: createLyricsService(),
    hashtagService: createHashtagService({ posts }),
    pushService,
    notifications,
    uploader: createCloudinaryUploader(cloudinary),
    sessionStore: createSessionStore(pool),
    sessions,
    sessionSecret: config.sessionSecret,
    secureCookies: config.secureCookies,
    defaultProfilePhoto: config.defaultProfilePhoto,
    clientDist: config.serveClient ? path.join(rootDir, 'dist') : undefined,
  };
}
