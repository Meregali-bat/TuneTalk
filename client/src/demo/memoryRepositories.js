// Repositórios em memória com o mesmo contrato dos repositórios Prisma do servidor,
// para que os serviços reais (server/src/services) rodem no navegador.
import { toPost } from '../../../server/src/repositories/postRepository.js';
import { hasHashtag } from '../../../shared/mentions.js';
import { FEED_PAGINA } from '../../../shared/feed.js';

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

  const votos = () => (state.votosEnquete ??= []);
  const postRow = (post) => toPost({
    ...post,
    createdAt: new Date(post.createdAt),
    opcoesEnquete: (post.opcoesEnquete ?? []).map((opcao) => ({
      ...opcao, _count: { votos: votos().filter((v) => v.opcaoId === opcao.id).length },
    })),
    autor: { ...author(post.autorId), postFixadoId: userById(post.autorId).postFixadoId ?? null },
    _count: {
      curtidas: state.curtidas.filter((c) => c.postId === post.id).length,
      respostas: state.posts.filter((p) => p.parentId === post.id).length,
    },
  });
  const byIdDesc = (a, b) => b.id - a.id;
  const topLevel = () => state.posts.filter((p) => !p.parentId);
  // Mesmo critério do banco: título e artista sem diferenciar maiúsculas; álbum separado de música.
  const igual = (a, b) => (a ?? '').toLowerCase() === (b ?? '').toLowerCase();
  const daObra = (p, { tipo, titulo, artista }) => igual(p.artistName, artista) && (tipo === 'album'
    ? p.postType === 'album' && igual(p.albumName, titulo)
    : p.postType !== 'album' && igual(p.musicName, titulo));
  // Mesma ordem e mesmo corte por página do banco: data e, no empate, id.
  const visivel = (ocultos) => (p) => !ocultos?.includes(p.autorId);
  const feedPage = (lista, { limit, antes, ocultos }) => {
    const depois = antes && ((p) => {
      const data = new Date(p.createdAt).getTime();
      return data < antes.data.getTime() || (data === antes.data.getTime() && p.id < antes.id);
    });
    return lista
      .filter((p) => (!depois || depois(p)) && visivel(ocultos)(p))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
      .slice(0, limit)
      .map(postRow);
  };

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
    async listLatest({ limit = FEED_PAGINA, antes, ocultos } = {}) {
      return feedPage(topLevel(), { limit, antes, ocultos });
    },
    async listByAuthor(autorId) {
      return topLevel().filter((p) => p.autorId === autorId).sort(byIdDesc).map(postRow);
    },
    async listFromFollowed(usuarioId, { limit = FEED_PAGINA, antes, ocultos } = {}) {
      const followed = new Set(await follows.followingIds(usuarioId));
      return feedPage(topLevel().filter((p) => followed.has(p.autorId)), { limit, antes, ocultos });
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
    async listByHashtag(tag, { limit = 50, ocultos } = {}) {
      return [...state.posts]
        .filter((p) => hasHashtag(p.texto ?? '', tag) && visivel(ocultos)(p))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
        .slice(0, limit)
        .map(postRow);
    },
    async listReplies(parentId, { ocultos } = {}) {
      return state.posts
        .filter((p) => p.parentId === parentId && visivel(ocultos)(p))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id)
        .map(postRow);
    },
    async listFirstReplies(parentIds, { ocultos } = {}) {
      const primeiras = new Map();
      for (const parentId of parentIds) {
        const [primeira] = await posts.listReplies(parentId, { ocultos });
        if (primeira) primeiras.set(parentId, primeira);
      }
      return primeiras;
    },
    async listByObra(obra, { limit = FEED_PAGINA, antes, ocultos } = {}) {
      return feedPage(topLevel().filter((p) => daObra(p, obra)), { limit, antes, ocultos });
    },
    async notasDaObra(obra) {
      return feedPage(topLevel().filter((p) => daObra(p, obra) && p.nota != null), { limit: Infinity })
        .map((p) => ({ autorId: p.autor.id, nota: p.nota }));
    },
    async countByAuthor(autorId) {
      return state.posts.filter((p) => p.autorId === autorId && !p.parentId).length;
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
        ...(post.enquete && {
          enqueteFim: post.enquete.fim.toISOString(),
          opcoesEnquete: post.enquete.opcoes.map((opcao, i) => ({ ...opcao, id: id * 10 + i, posicao: i })),
        }),
      });
      return changed(id);
    },
    async votar(postId, usuarioId, opcaoId) {
      if (votos().some((v) => v.postId === postId && v.usuarioId === usuarioId)) return false;
      votos().push({ postId, usuarioId, opcaoId });
      changed();
      return true;
    },
    async votosDe(usuarioId, postIds) {
      return new Map(votos().filter((v) => v.usuarioId === usuarioId && postIds.includes(v.postId)).map((v) => [v.postId, v.opcaoId]));
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
      state.votosEnquete = votos().filter((v) => !removed.has(v.postId));
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
    async exists(destinatarioId, tipo) {
      return state.notificacoes.some((n) => n.destinatarioId === destinatarioId && n.tipo === tipo);
    },
    async removeLike(postId, usuarioId) {
      state.notificacoes = state.notificacoes.filter((n) => !(n.postId === postId && n.autorId === usuarioId && n.tipo === 'like'));
      changed();
    },
  };

  state.bloqueios ??= [];
  state.silencios ??= [];
  // Mesmo comportamento do restricaoRepository do servidor.
  const restricoes = {
    async bloquear(bloqueadorId, bloqueadoId) {
      if (!state.bloqueios.some((b) => b.bloqueadorId === bloqueadorId && b.bloqueadoId === bloqueadoId)) {
        state.bloqueios.push({ bloqueadorId, bloqueadoId });
      }
      state.seguimentos = state.seguimentos.filter((s) => !(
        (s.seguidorId === bloqueadorId && s.seguidoId === bloqueadoId) || (s.seguidorId === bloqueadoId && s.seguidoId === bloqueadorId)
      ));
      changed();
    },
    async desbloquear(bloqueadorId, bloqueadoId) {
      state.bloqueios = state.bloqueios.filter((b) => !(b.bloqueadorId === bloqueadorId && b.bloqueadoId === bloqueadoId));
      changed();
    },
    async silenciar(usuarioId, silenciadoId) {
      if (!state.silencios.some((s) => s.usuarioId === usuarioId && s.silenciadoId === silenciadoId)) {
        state.silencios.push({ usuarioId, silenciadoId });
      }
      changed();
    },
    async dessilenciar(usuarioId, silenciadoId) {
      state.silencios = state.silencios.filter((s) => !(s.usuarioId === usuarioId && s.silenciadoId === silenciadoId));
      changed();
    },
    async relacao(viewerId, outroId) {
      return {
        bloqueado: state.bloqueios.some((b) => b.bloqueadorId === viewerId && b.bloqueadoId === outroId),
        meBloqueou: state.bloqueios.some((b) => b.bloqueadorId === outroId && b.bloqueadoId === viewerId),
        silenciado: state.silencios.some((s) => s.usuarioId === viewerId && s.silenciadoId === outroId),
      };
    },
    async ocultosPara(viewerId) {
      const ids = new Set(state.silencios.filter((s) => s.usuarioId === viewerId).map((s) => s.silenciadoId));
      for (const b of state.bloqueios) {
        if (b.bloqueadorId === viewerId) ids.add(b.bloqueadoId);
        if (b.bloqueadoId === viewerId) ids.add(b.bloqueadorId);
      }
      return [...ids];
    },
    async listar(usuarioId) {
      return {
        bloqueados: state.bloqueios.filter((b) => b.bloqueadorId === usuarioId).map((b) => publicUser(userById(b.bloqueadoId))),
        silenciados: state.silencios.filter((s) => s.usuarioId === usuarioId).map((s) => publicUser(userById(s.silenciadoId))),
      };
    },
  };

  return { users, follows, posts, likes, resets, notifications, restricoes };
}
