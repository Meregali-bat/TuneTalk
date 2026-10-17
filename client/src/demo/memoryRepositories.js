// Repositórios em memória com o mesmo contrato dos repositórios Prisma do servidor,
// para que os serviços reais (server/src/services) rodem no navegador.
import md5 from 'md5';
import { toPost } from '../../../server/src/repositories/postRepository.js';

const publicUser = ({ id, nome, fotoPerfil, bio }) => ({ id, nome, fotoPerfil, bio });

export function createMemoryRepositories(state, onChange) {
  const nextId = (table) => {
    state.seq[table] += 1;
    return state.seq[table];
  };
  const changed = (value) => {
    onChange();
    return value;
  };
  const userById = (id) => state.usuarios.find((u) => u.id === id);
  const author = (id) => {
    const { nome, fotoPerfil } = userById(id);
    return { id, nome, fotoPerfil };
  };

  const postRow = (post) => toPost({
    ...post,
    createdAt: new Date(post.createdAt),
    autor: author(post.autorId),
    _count: {
      curtidas: state.curtidas.filter((c) => c.postId === post.id).length,
      comentarios: state.comentarios.filter((c) => c.postId === post.id).length,
    },
  });
  const byIdDesc = (a, b) => b.id - a.id;

  const same = (a, b) => (a ?? '').toLowerCase() === (b ?? '').toLowerCase();

  const users = {
    async findByCredentials(email, senha) {
      const user = state.usuarios.find((u) => same(u.email, email));
      if (!user || user.senha !== md5(senha)) return null;
      return { ...publicUser(user), email: user.email };
    },
    async existsByEmail(email) {
      return state.usuarios.some((u) => same(u.email, email));
    },
    async isNameTaken(nome, exceptId) {
      return state.usuarios.some((u) => u.id !== exceptId && u.nome && same(u.nome, nome));
    },
    async create({ email, senha, fotoPerfil }) {
      const id = nextId('usuarios');
      state.usuarios.push({ id, nome: null, email, senha: md5(senha), fotoPerfil, bio: null });
      return changed(id);
    },
    async findById(id) {
      const user = userById(id);
      return user ? publicUser(user) : null;
    },
    async update(id, changes) {
      Object.assign(userById(id), changes);
      changed();
    },
  };

  const follows = {
    async isFollowing(seguidorId, seguidoId) {
      return state.seguimentos.some((s) => s.seguidorId === seguidorId && s.seguidoId === seguidoId);
    },
    async follow(seguidorId, seguidoId) {
      state.seguimentos.push({ seguidorId, seguidoId });
      changed();
    },
    async unfollow(seguidorId, seguidoId) {
      state.seguimentos = state.seguimentos.filter((s) => !(s.seguidorId === seguidorId && s.seguidoId === seguidoId));
      changed();
    },
    async followingIds(id) {
      return state.seguimentos.filter((s) => s.seguidorId === id).map((s) => s.seguidoId);
    },
    async listFollowing(id) {
      return state.seguimentos.filter((s) => s.seguidorId === id).map((s) => publicUser(userById(s.seguidoId)));
    },
    async listFollowers(id) {
      return state.seguimentos.filter((s) => s.seguidoId === id).map((s) => publicUser(userById(s.seguidorId)));
    },
    async countFollowing(id) {
      return state.seguimentos.filter((s) => s.seguidorId === id).length;
    },
    async countFollowers(id) {
      return state.seguimentos.filter((s) => s.seguidoId === id).length;
    },
  };

  const posts = {
    async listLatest() {
      return [...state.posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20).map(postRow);
    },
    async listByAuthor(autorId) {
      return state.posts.filter((p) => p.autorId === autorId).sort(byIdDesc).map(postRow);
    },
    async listFromFollowed(usuarioId) {
      const followed = new Set(await follows.followingIds(usuarioId));
      return state.posts.filter((p) => followed.has(p.autorId)).sort(byIdDesc).map(postRow);
    },
    async findById(id) {
      const post = state.posts.find((p) => p.id === id);
      return post ? postRow(post) : null;
    },
    async create(post) {
      const id = nextId('posts');
      const nota = Number(post.nota);
      state.posts.push({
        id,
        autorId: post.autorId,
        texto: post.texto ?? '',
        musicName: post.musicName ?? null,
        artistName: post.artistName ?? null,
        posterMusica: post.posterMusica ?? null,
        albumName: post.albumName ?? null,
        posterAlbum: post.posterAlbum ?? null,
        postType: post.postType ?? null,
        releaseDate: post.releaseDate == null ? null : String(post.releaseDate),
        nota: Number.isFinite(nota) ? nota : 0,
        musicPreview: post.musicPreview ?? null,
        createdAt: post.data.toISOString(),
      });
      return changed(id);
    },
    async remove(id) {
      state.posts = state.posts.filter((p) => p.id !== id);
      state.comentarios = state.comentarios.filter((c) => c.postId !== id);
      state.curtidas = state.curtidas.filter((c) => c.postId !== id);
      state.notificacoes = state.notificacoes.filter((n) => n.postId !== id);
      changed();
    },
  };

  const likes = {
    async hasLiked(postId, usuarioId) {
      return state.curtidas.some((c) => c.postId === postId && c.usuarioId === usuarioId);
    },
    async add({ postId, usuarioId }) {
      state.curtidas.push({ postId, usuarioId });
      changed();
    },
    async remove(postId, usuarioId) {
      state.curtidas = state.curtidas.filter((c) => !(c.postId === postId && c.usuarioId === usuarioId));
      changed();
    },
    async likedPostIds(usuarioId) {
      return state.curtidas.filter((c) => c.usuarioId === usuarioId).map((c) => c.postId);
    },
    async countByPost(postId) {
      return state.curtidas.filter((c) => c.postId === postId).length;
    },
  };

  const comments = {
    async create({ postId, usuarioId, texto }) {
      const id = nextId('comentarios');
      state.comentarios.push({ id, postId, autorId: usuarioId, texto });
      return changed(id);
    },
    async listByPost(postId) {
      return state.comentarios
        .filter((c) => c.postId === postId)
        .sort(byIdDesc)
        .map((c) => ({ id: c.id, texto: c.texto, autor: author(c.autorId) }));
    },
  };

  const notifications = {
    async listForUser(usuarioId) {
      return state.notificacoes
        .filter((n) => n.destinatarioId === usuarioId)
        .sort(byIdDesc)
        .map((n) => ({
          id: n.id, tipo: n.tipo, conteudo: n.conteudo, lida: n.lida, postId: n.postId, data: n.createdAt, autor: author(n.autorId),
        }));
    },
    async countUnread(usuarioId) {
      return state.notificacoes.filter((n) => n.destinatarioId === usuarioId && !n.lida).length;
    },
    async markAllRead(usuarioId) {
      state.notificacoes.forEach((n) => { if (n.destinatarioId === usuarioId) n.lida = true; });
      changed();
    },
    async create({ destinatarioId, autorId, tipo, conteudo, postId = null }) {
      state.notificacoes.push({
        id: nextId('notificacoes'), destinatarioId, autorId, tipo, conteudo, lida: false, postId, createdAt: new Date().toISOString(),
      });
      changed();
    },
    async removeLike(postId, usuarioId) {
      state.notificacoes = state.notificacoes.filter((n) => !(n.postId === postId && n.autorId === usuarioId && n.tipo === 'like'));
      changed();
    },
  };

  return { users, follows, posts, likes, comments, notifications };
}
