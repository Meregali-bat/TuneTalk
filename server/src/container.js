import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import { createPrismaClient } from './infra/prisma.js';
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

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Composição real das dependências (Postgres via Prisma, Cloudinary, Deezer).
export function buildContainer(config) {
  const prisma = createPrismaClient(config.databaseUrl);
  cloudinary.config(config.cloudinary);

  const users = createUserRepository(prisma);
  const posts = createPostRepository(prisma);
  const likes = createLikeRepository(prisma);
  const follows = createFollowRepository(prisma);
  const notifications = createNotificationRepository(prisma);

  const postService = createPostService({ posts, likes, notifications });

  return {
    authService: createAuthService({ users }),
    postService,
    userService: createUserService({ users, follows, postService, notifications }),
    musicService: createMusicService(),
    notifications,
    uploader: createCloudinaryUploader(cloudinary),
    sessionSecret: config.sessionSecret,
    secureCookies: config.secureCookies,
    defaultProfilePhoto: config.defaultProfilePhoto,
    clientDist: config.isProduction ? path.join(rootDir, 'dist') : undefined,
  };
}
