import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authApi, musicApi, notificationsApi, postsApi, usersApi } from './index.js';
import { request } from './http.js';

vi.mock('./http.js', () => ({ request: vi.fn().mockResolvedValue('ok') }));

describe('endpoints da API', () => {
  beforeEach(() => request.mockClear());

  it.each([
    ['authApi.me', () => authApi.me(), ['/auth/me']],
    ['authApi.login', () => authApi.login('a@a.com', 's'), ['/auth/login', { method: 'POST', body: { email: 'a@a.com', senha: 's' } }]],
    ['authApi.logout', () => authApi.logout(), ['/auth/logout', { method: 'POST' }]],
    ['postsApi.feed', () => postsApi.feed('seguindo'), ['/posts?feed=seguindo']],
    ['postsApi.get', () => postsApi.get(3), ['/posts/3']],
    ['postsApi.create', () => postsApi.create({ texto: 'x' }), ['/posts', { method: 'POST', body: { texto: 'x' } }]],
    ['postsApi.remove', () => postsApi.remove(3), ['/posts/3', { method: 'DELETE' }]],
    ['postsApi.like', () => postsApi.like(3), ['/posts/3/like', { method: 'POST' }]],
    ['postsApi.unlike', () => postsApi.unlike(3), ['/posts/3/like', { method: 'DELETE' }]],
    ['postsApi.comment', () => postsApi.comment(3, 'oi'), ['/posts/3/comments', { method: 'POST', body: { texto: 'oi' } }]],
    ['usersApi.profile', () => usersApi.profile(2), ['/users/2']],
    ['usersApi.follow', () => usersApi.follow(2), ['/users/2/follow', { method: 'POST' }]],
    ['usersApi.unfollow', () => usersApi.unfollow(2), ['/users/2/follow', { method: 'DELETE' }]],
    ['notificationsApi.list', () => notificationsApi.list(), ['/notifications']],
    ['notificationsApi.readAll', () => notificationsApi.readAll(), ['/notifications/read-all', { method: 'POST' }]],
    ['musicApi.search', () => musicApi.search('a b'), ['/music/search?q=a%20b']],
  ])('%s chama o endpoint certo', async (_, call, args) => {
    await call();
    expect(request).toHaveBeenCalledWith(...args);
  });

  it('authApi.register envia só email e senha', async () => {
    await authApi.register({ email: 'a@a.com', senha: 's' });
    expect(request).toHaveBeenCalledWith('/auth/register', { method: 'POST', body: { email: 'a@a.com', senha: 's' } });
  });

  it('usersApi.setUsername define o nome de usuário', async () => {
    await usersApi.setUsername('ana');
    expect(request).toHaveBeenCalledWith('/users/me/username', { method: 'PUT', body: { nome: 'ana' } });
  });

  it('usersApi.updateMe envia FormData', async () => {
    const form = new FormData();
    await usersApi.updateMe(form);
    expect(request).toHaveBeenCalledWith('/users/me', { method: 'PUT', form });
  });

  it('notificationsApi.unreadCount devolve só o número', async () => {
    request.mockResolvedValueOnce({ count: 4 });
    expect(await notificationsApi.unreadCount()).toBe(4);
  });

  it('postsApi.like/unlike devolvem só o total', async () => {
    request.mockResolvedValueOnce({ likes: 7 });
    expect(await postsApi.like(1)).toBe(7);
  });
});
