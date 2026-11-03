// Repositórios em memória com o mesmo contrato dos repositórios Prisma do servidor,
// para que os serviços reais (server/src/services) rodem no navegador.
import { toPost } from '../../../server/src/repositories/postRepository.js';
import { hasHashtag } from '../../../shared/mentions.js';

const publicUser = ({
  id, nome, nomeExibicao = null, fotoPerfil, bannerUrl = null, bio, fundadorDesde = null, mostrarSeloFundador = true,
}) => ({ id, nome, nomeExibicao, fotoPerfil, bannerUrl, bio, fundadorDesde, mostrarSeloFundador });

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
    const { nome, nomeExibicao = null, fotoPerfil, fundadorDesde, mostrarSeloFundador = true } = userById(id);
    return { id, nome, nomeExibicao, fotoPerfil, fundadorDesde, mostrarSeloFundador };
  };

  const postRow = (post) => toPost({
    ...post,
    createdAt: new Date(post.createdAt),
    autor: { ...author(post.autorId), postFixadoId: userById(post.autorId).postFixadoId ?? null },
    _count: {
      curtidas: state.curtidas.filter((c) => c.postId === post.id).length,
      respostas: state.posts.filter((p) => p.parentId === post.id).length,
    },
  });
  const byIdDesc = (a, b) => b.id - a.id;
  const topLevel = () => state.posts.filter((p) => !p.parentId);

  const same = (a, b) => (a ?? '').toLowerCase() === (b ?? '').toLowerCase();

  const users = {
    async search(texto, limite = 20) {
      const t = texto.toLowerCase();
      const campos = (u) => [u.nome, u.nomeExibicao].filter(Boolean).map((v) => v.toLowerCase());
      const comNome = state.usuarios.filter((u) => u.nome).sort((a, b) => a.nome.localeCompare(b.nome));
      const comeco = comNome.filter((u) => campos(u).some((v) => v.startsWith(t)));
      const resto = comNome.filter((u) => !comeco.includes(u) && campos(u).some((v) => v.includes(t)));
      return [...comeco, ...resto].slice(0, limite).map(publicUser);
    },
    async findAuthByEmail(email) {
      const user = state.usuarios.find((u) => same(u.email, email));
      return user ? {
        id: user.id, nome: user.nome, email: user.email, senha: user.senha, veterano: Boolean(user.veterano), fundadorDesde: user.fundadorDesde ?? null,
      } : null;
    },
    async findAuthById(id) {
      const user = userById(id);
      return user ? { id: user.id, senha: user.senha } : null;
    },
    async findByNames(nomes) {
      const procurados = new Set(nomes.map((n) => n.toLowerCase()));
      return state.usuarios.filter((u) => u.nome && procurados.has(u.nome.toLowerCase())).map(({ id, nome }) => ({ id, nome }));
    },
    async activateFounder(id) {
      userById(id).fundadorDesde = new Date().toISOString();
      changed();
    },
    async setPinnedPost(id, postId) {
      userById(id).postFixadoId = postId;
      changed();
    },
    async updatePassword(id, senhaHash) {
      userById(id).senha = senhaHash;
      changed();
    },
    async existsByEmail(email) {
      return state.usuarios.some((u) => same(u.email, email));
    },
    async isNameTaken(nome, exceptId) {
      return state.usuarios.some((u) => u.id !== exceptId && u.nome && same(u.nome, nome));
    },
    async create({ email, senhaHash, fotoPerfil }) {
      const id = nextId('usuarios');
      state.usuarios.push({ id, nome: null, email, senha: senhaHash, fotoPerfil, bio: null });
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
    async getFavorites(id) {
      const usuario = state.usuarios.find((u) => u.id === id);
      return usuario ? (usuario.favoritos ?? {}) : null;
    },
    async setFavorites(id, favoritos) {
      userById(id).favoritos = favoritos;
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
    async listLatest(limit = 50) {
      return topLevel().sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id).slice(0, limit).map(postRow);
    },
    async listByAuthor(autorId) {
      return topLevel().filter((p) => p.autorId === autorId).sort(byIdDesc).map(postRow);
    },
    async listFromFollowed(usuarioId) {
      const followed = new Set(await follows.followingIds(usuarioId));
      return topLevel().filter((p) => followed.has(p.autorId)).sort(byIdDesc).map(postRow);
    },
    async listHashtagTexts({ desde, contem, limite }) {
      const trecho = contem ? `#${contem}`.toLowerCase() : '#';
      return [...state.posts]
        .filter((p) => (p.texto ?? '').toLowerCase().includes(trecho) && (!desde || new Date(p.createdAt) >= desde))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
        .slice(0, limite)
        .map((p) => p.texto);
    },
    async listRepliesByAuthor(autorId, limit = 50) {
      return state.posts
        .filter((p) => p.autorId === autorId && p.parentId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
        .slice(0, limit)
        .map((p) => {
          const pai = state.posts.find((x) => x.id === p.parentId);
          return { ...postRow(p), respondendoA: { postId: pai.id, nome: userById(pai.autorId).nome } };
        });
    },
    async listByHashtag(tag, limit = 50) {
      return [...state.posts]
        .filter((p) => hasHashtag(p.texto ?? '', tag))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
        .slice(0, limit)
        .map(postRow);
    },
    async listReplies(parentId) {
      return state.posts
        .filter((p) => p.parentId === parentId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id)
        .map(postRow);
    },
    async listFirstReplies(parentIds) {
      const primeiras = new Map();
      for (const parentId of parentIds) {
        const [primeira] = await posts.listReplies(parentId);
        if (primeira) primeiras.set(parentId, primeira);
      }
      return primeiras;
    },
    async findById(id) {
      const post = state.posts.find((p) => p.id === id);
      return post ? postRow(post) : null;
    },
    async create(post) {
      const id = nextId('posts');
      const nota = post.nota == null ? null : Number(post.nota);
      state.posts.push({
        id,
        autorId: post.autorId,
        parentId: post.parentId ?? null,
        texto: post.texto ?? '',
        musicName: post.musicName ?? null,
        artistName: post.artistName ?? null,
        posterMusica: post.posterMusica ?? null,
        albumName: post.albumName ?? null,
        posterAlbum: post.posterAlbum ?? null,
        postType: post.postType ?? null,
        releaseDate: post.releaseDate == null ? null : String(post.releaseDate),
        nota: Number.isFinite(nota) ? nota : null,
        musicPreview: post.musicPreview ?? null,
        imagemUrl: post.imagemUrl ?? null,
        imagemProporcao: post.imagemProporcao ?? null,
        trechoLetra: post.trechoLetra?.length ? post.trechoLetra.join('\n') : null,
        createdAt: post.data.toISOString(),
      });
      return changed(id);
    },
    // Como o ON DELETE CASCADE do banco: leva junto as respostas, e as respostas delas.
    async remove(id) {
      const removed = new Set([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const p of state.posts) {
          if (p.parentId && removed.has(p.parentId) && !removed.has(p.id)) {
            removed.add(p.id);
            grew = true;
          }
        }
      }
      state.posts = state.posts.filter((p) => !removed.has(p.id));
      state.usuarios.forEach((u) => { if (removed.has(u.postFixadoId)) u.postFixadoId = null; });
      state.curtidas = state.curtidas.filter((c) => !removed.has(c.postId));
      state.notificacoes = state.notificacoes.filter((n) => !removed.has(n.postId));
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

  state.redefinicoes ??= [];
  const resets = {
    async create({ usuarioId, tokenHash, expiraEm }) {
      state.redefinicoes.push({
        id: state.redefinicoes.length + 1, usuarioId, tokenHash, expiraEm: expiraEm.toISOString(), usadoEm: null, createdAt: new Date().toISOString(),
      });
      changed();
    },
    async findValid(tokenHash, agora) {
      const r = state.redefinicoes.find((x) => x.tokenHash === tokenHash && !x.usadoEm && new Date(x.expiraEm) > agora);
      return r ? { id: r.id, usuarioId: r.usuarioId } : null;
    },
    async claim(id, agora) {
      const r = state.redefinicoes.find((x) => x.id === id && !x.usadoEm);
      if (!r) return false;
      r.usadoEm = agora.toISOString();
      return changed(true);
    },
    async countSince(usuarioId, desde) {
      return state.redefinicoes.filter((x) => x.usuarioId === usuarioId && new Date(x.createdAt) >= desde).length;
    },
    async deleteForUser(usuarioId) {
      state.redefinicoes = state.redefinicoes.filter((x) => x.usuarioId !== usuarioId);
      changed();
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

  return { users, follows, posts, likes, resets, notifications };
}
