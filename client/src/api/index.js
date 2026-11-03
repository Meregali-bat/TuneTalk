import { ApiError, request } from './http.js';
import { IMAGEM_MAX_MB } from './limits.js';

// Imagens vão direto do navegador para o Cloudinary, com uma assinatura feita pelo servidor:
// a Vercel recusa requisições acima de 4,5 MB, e GIF animado passa disso fácil.
async function uploadImage(signaturePath, file) {
  const { uploadUrl, fields } = await request(signaturePath, { method: 'POST' });
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.append(key, value));
  form.append('file', file);

  const response = await fetch(uploadUrl, { method: 'POST', body: form });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const tooLarge = /file size too large/i.test(data?.error?.message ?? '');
    throw new ApiError(response.status, tooLarge
      ? `A imagem pode ter no máximo ${IMAGEM_MAX_MB} MB.`
      : 'Não foi possível enviar essa imagem. Tente outra.');
  }
  return data.secure_url;
}

export const authApi = {
  me: () => request('/auth/me'),
  login: (email, senha) => request('/auth/login', { method: 'POST', body: { email, senha } }),
  register: ({ email, senha }) => request('/auth/register', { method: 'POST', body: { email, senha } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token, novaSenha) => request('/auth/reset-password', { method: 'POST', body: { token, novaSenha } }),
};

export const postsApi = {
  feed: (feed) => request(`/posts?feed=${feed}`),
  get: (id) => request(`/posts/${id}`),
  // Comentários também são criados aqui, com parentId.
  create: (post) => request('/posts', { method: 'POST', body: post }),
  remove: (id) => request(`/posts/${id}`, { method: 'DELETE' }),
  uploadImage: (file) => uploadImage('/posts/image-upload', file),
  pin: (id) => request(`/posts/${id}/pin`, { method: 'POST' }),
  unpin: (id) => request(`/posts/${id}/pin`, { method: 'DELETE' }),
  like: async (id) => (await request(`/posts/${id}/like`, { method: 'POST' })).likes,
  unlike: async (id) => (await request(`/posts/${id}/like`, { method: 'DELETE' })).likes,
};

export const usersApi = {
  profile: (id) => request(`/users/${id}`),
  search: (q) => request(`/users?q=${encodeURIComponent(q)}`),
  updateMe: (changes) => request('/users/me', { method: 'PUT', body: changes }),
  uploadPhoto: (file) => uploadImage('/users/me/photo-upload', file),
  uploadBanner: (file) => uploadImage('/users/me/banner-upload', file),
  setUsername: (nome) => request('/users/me/username', { method: 'PUT', body: { nome } }),
  changePassword: (senhaAtual, novaSenha) =>
    request('/users/me/password', { method: 'PUT', body: { senhaAtual, novaSenha } }),
  follow: (id) => request(`/users/${id}/follow`, { method: 'POST' }),
  unfollow: (id) => request(`/users/${id}/follow`, { method: 'DELETE' }),
};

export const notificationsApi = {
  list: () => request('/notifications'),
  unreadCount: async () => (await request('/notifications/unread-count')).count,
  readAll: () => request('/notifications/read-all', { method: 'POST' }),
};

export const musicApi = {
  // tipo 'album' busca álbuns; sem tipo, faixas.
  search: (q, tipo) => request(`/music/search?q=${encodeURIComponent(q)}${tipo === 'album' ? '&tipo=album' : ''}`),
};
