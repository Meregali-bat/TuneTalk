import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import { createDatabase, createPool } from './infra/database.js';
import { createCloudinaryUploader } from './infra/cloudinaryUploader.js';
import { createUserRepository } from './repositories/userRepository.js';
import { createPostRepository } from './repositories/postRepository.js';
import { createLikeRepository } from './repositories/likeRepository.js';
import { createCommentRepository } from './repositories/commentRepository.js';
import { createFollowRepository } from './repositories/followRepository.js';
import { createNotificationRepository } from './repositories/notificationRepository.js';
import { createAuthService } from './services/authService.js';
import { createPostService } from './services/postService.js';
import { createUserService } from './services/userService.js';
import { createMusicService } from './services/musicService.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Composição real das dependências (banco, Cloudinary, Deezer).
export function buildContainer(config) {
  const db = createDatabase(createPool(config.db));
  cloudinary.config(config.cloudinary);

  const users = createUserRepository(db);
  const posts = createPostRepository(db);
  const likes = createLikeRepository(db);
  const comments = createCommentRepository(db);
  const follows = createFollowRepository(db);
  const notifications = createNotificationRepository(db);

  const postService = createPostService({ posts, likes, comments, notifications });

  return {
    authService: createAuthService({ users }),
    postService,
    userService: createUserService({ users, follows, postService, notifications }),
    musicService: createMusicService(),
    notifications,
    uploader: createCloudinaryUploader(cloudinary),
    sessionSecret: config.sessionSecret,
    secureCookies: config.isProduction,
    defaultProfilePhoto: config.defaultProfilePhoto,
    clientDist: config.isProduction ? path.join(rootDir, 'dist') : undefined,
  };
}
