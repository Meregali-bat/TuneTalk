import { request } from './http.js';

export const authApi = {
  me: () => request('/auth/me'),
  login: (email, senha) => request('/auth/login', { method: 'POST', body: { email, senha } }),
  register: ({ email, senha }) => request('/auth/register', { method: 'POST', body: { email, senha } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
};

export const postsApi = {
  feed: (feed) => request(`/posts?feed=${feed}`),
  get: (id) => request(`/posts/${id}`),
  create: (post) => request('/posts', { method: 'POST', body: post }),
  remove: (id) => request(`/posts/${id}`, { method: 'DELETE' }),
  like: async (id) => (await request(`/posts/${id}/like`, { method: 'POST' })).likes,
  unlike: async (id) => (await request(`/posts/${id}/like`, { method: 'DELETE' })).likes,
  comment: (id, texto) => request(`/posts/${id}/comments`, { method: 'POST', body: { texto } }),
};

export const usersApi = {
  profile: (id) => request(`/users/${id}`),
  updateMe: (form) => request('/users/me', { method: 'PUT', form }),
  setUsername: (nome) => request('/users/me/username', { method: 'PUT', body: { nome } }),
  follow: (id) => request(`/users/${id}/follow`, { method: 'POST' }),
  unfollow: (id) => request(`/users/${id}/follow`, { method: 'DELETE' }),
};

export const notificationsApi = {
  list: () => request('/notifications'),
  unreadCount: async () => (await request('/notifications/unread-count')).count,
  readAll: () => request('/notifications/read-all', { method: 'POST' }),
};

export const musicApi = {
  search: (q) => request(`/music/search?q=${encodeURIComponent(q)}`),
};
