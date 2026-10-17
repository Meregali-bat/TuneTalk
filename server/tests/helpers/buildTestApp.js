import { vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

export const sessionUser = { id: 1, nome: 'Ana', email: 'ana@x.com' };

export function buildTestApp(overrides = {}) {
  const deps = {
    authService: { login: vi.fn().mockResolvedValue(sessionUser), register: vi.fn() },
    postService: {
      forYou: vi.fn(),
      following: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
      like: vi.fn(),
      unlike: vi.fn(),
      comment: vi.fn(),
    },
    userService: { getProfile: vi.fn(), updateProfile: vi.fn(), follow: vi.fn(), unfollow: vi.fn() },
    notifications: { listForUser: vi.fn(), countUnread: vi.fn(), markAllRead: vi.fn() },
    musicService: { search: vi.fn() },
    uploader: { upload: vi.fn() },
    sessionSecret: 'test-secret',
    defaultProfilePhoto: 'default.png',
    ...overrides,
  };
  return { app: createApp(deps), deps };
}

export async function loggedAgent(app) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: 'ana@x.com', senha: 'Senha!1' }).expect(200);
  return agent;
}
