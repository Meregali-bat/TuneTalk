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

const paginaSeguinte = (depois) => (depois ? `&antes=${encodeURIComponent(depois.data)}&antesId=${depois.id}` : '');

// Lista "Quero ouvir". disco: { tipo: 'album' | 'musica', titulo, artista, capa?, releaseDate?, preview? }.
export const queroOuvirApi = {
  list: () => request('/quero-ouvir'),
  add: (disco) => request('/quero-ouvir', { method: 'POST', body: disco }),
  remove: ({ tipo, titulo, artista }) =>
    request(`/quero-ouvir?${new URLSearchParams({ tipo, titulo, artista })}`, { method: 'DELETE' }),
};

// Página de um álbum ou música (tipo 'album' ou 'musica'): resumo das notas e posts, em páginas.
export const obrasApi = {
  get: (tipo, titulo, artista, depois) =>
    request(`/obras/${tipo}?${new URLSearchParams({ titulo, artista })}${paginaSeguinte(depois)}`),
};

export const postsApi = {
  // Sem `depois`, a primeira página; com ele (o último post já mostrado), a página seguinte.
  feed: (feed, depois) => request(depois
    ? `/posts?feed=${feed}&antes=${encodeURIComponent(depois.data)}&antesId=${depois.id}`
    : `/posts?feed=${feed}`),
  get: (id) => request(`/posts/${id}`),
  byHashtag: (tag) => request(`/posts?tag=${encodeURIComponent(tag)}`),
  // Comentários também são criados aqui, com parentId.
  create: (post) => request('/posts', { method: 'POST', body: post }),
  remove: (id) => request(`/posts/${id}`, { method: 'DELETE' }),
  uploadImage: (file) => uploadImage('/posts/image-upload', file),
  // Voto na enquete de músicas: devolve a enquete atualizada (com meuVoto).
  votar: (id, opcaoId) => request(`/posts/${id}/votos`, { method: 'POST', body: { opcaoId } }),
  pin: (id) => request(`/posts/${id}/pin`, { method: 'POST' }),
  unpin: (id) => request(`/posts/${id}/pin`, { method: 'DELETE' }),
  like: async (id) => (await request(`/posts/${id}/like`, { method: 'POST' })).likes,
  unlike: async (id) => (await request(`/posts/${id}/like`, { method: 'DELETE' })).likes,
};

export const usersApi = {
  // id numérico ou "@nome" (link das marcações).
  profile: (id) => (String(id).startsWith('@')
    ? request(`/users/by-name/${encodeURIComponent(String(id).slice(1))}`)
    : request(`/users/${id}`)),
  search: (q) => request(`/users?q=${encodeURIComponent(q)}`),
  comments: (id) => request(`/users/${id}/comentarios`),
  updateMe: (changes) => request('/users/me', { method: 'PUT', body: changes }),
  uploadPhoto: (file) => uploadImage('/users/me/photo-upload', file),
  uploadBanner: (file) => uploadImage('/users/me/banner-upload', file),
  // { musicas, albuns, artistas }, até 5 de cada.
  updateFavorites: (favoritos) => request('/users/me/favoritos', { method: 'PUT', body: favoritos }),
  setUsername: (nome) => request('/users/me/username', { method: 'PUT', body: { nome } }),
  // Devolve o usuário da sessão já com o email novo.
  changeEmail: (senhaAtual, novoEmail) =>
    request('/users/me/email', { method: 'PUT', body: { senhaAtual, novoEmail } }),
  changePassword: (senhaAtual, novaSenha) =>
    request('/users/me/password', { method: 'PUT', body: { senhaAtual, novaSenha } }),
  follow: (id) => request(`/users/${id}/follow`, { method: 'POST' }),
  unfollow: (id) => request(`/users/${id}/follow`, { method: 'DELETE' }),
  bloquear: (id) => request(`/users/${id}/bloqueio`, { method: 'POST' }),
  desbloquear: (id) => request(`/users/${id}/bloqueio`, { method: 'DELETE' }),
  silenciar: (id) => request(`/users/${id}/silencio`, { method: 'POST' }),
  dessilenciar: (id) => request(`/users/${id}/silencio`, { method: 'DELETE' }),
  // Quem seguir: [{ usuario, motivo }].
  sugestoes: () => request('/users/sugestoes'),
  // { bloqueados, silenciados }
  restricoes: () => request('/users/me/restricoes'),
};

// Avisos no celular (push da web). chave() é null quando o servidor está sem as chaves VAPID.
export const pushApi = {
  chave: async () => (await request('/push/chave')).chave ?? null,
  inscrever: (inscricao) => request('/push/inscricoes', { method: 'POST', body: inscricao }),
  cancelar: (endpoint) => request('/push/inscricoes', { method: 'DELETE', body: { endpoint } }),
};

export const notificationsApi = {
  list: () => request('/notifications'),
  unreadCount: async () => (await request('/notifications/unread-count')).count,
  readAll: () => request('/notifications/read-all', { method: 'POST' }),
};

export const hashtagsApi = {
  trending: () => request('/hashtags/em-alta'),
  search: (q) => request(`/hashtags?q=${encodeURIComponent(q)}`),
};

export const musicApi = {
  // Link novo da prévia (os do Deezer vencem).
  preview: async (titulo, artista) =>
    (await request(`/music/preview?titulo=${encodeURIComponent(titulo)}&artista=${encodeURIComponent(artista ?? '')}`)).preview,
  // Versos da letra para escolher o trecho. [] quando não há letra; erro (com status) se a base de letras falhar.
  // Confere o formato: se a resposta vier estranha, trata como "sem letra" em vez de quebrar a tela.
  lyrics: async (titulo, artista, duracao) => {
    const params = new URLSearchParams({ titulo, artista: artista ?? '', ...(duracao && { duracao: String(duracao) }) });
    try {
      const resposta = await request(`/music/lyrics?${params}`);
      return Array.isArray(resposta?.versos) ? resposta.versos.filter((v) => typeof v === 'string' && v.trim()) : [];
    } catch (err) {
      if (err.status === 404) return [];
      throw err;
    }
  },
  // tipo 'album' busca álbuns, 'artista' busca artistas; sem tipo, faixas.
  search: (q, tipo) => request(`/music/search?q=${encodeURIComponent(q)}${['album', 'artista'].includes(tipo) ? `&tipo=${tipo}` : ''}`),
};
