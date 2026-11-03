import { badRequest, forbidden, notFound } from '../errors.js';
import { isValidNota, parseNota } from '../../../shared/rating.js';
import { extractMentions } from '../../../shared/mentions.js';

const TEXTO_MAX = 500;
const MAX_MARCACOES = 10;

const CREATE_FIELDS = [
  'texto', 'musicName', 'artistName', 'posterMusica', 'albumName',
  'posterAlbum', 'postType', 'releaseDate', 'nota', 'musicPreview', 'imagemUrl', 'imagemProporcao',
];

// Proporção largura/altura da imagem cortada: de bem alta (1:5) a bem larga (5:1).
const parseProporcao = (value, temImagem) => {
  if (value === undefined || value === null) return undefined;
  const proporcao = Number(value);
  if (!temImagem || !Number.isFinite(proporcao) || proporcao < 0.2 || proporcao > 5) {
    throw badRequest('Proporção da imagem inválida.');
  }
  return proporcao;
};

const pick = (source, fields) =>
  Object.fromEntries(fields.filter((f) => source[f] !== undefined).map((f) => [f, source[f]]));

const parseParentId = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw badRequest('Post respondido inválido.');
  return id;
};

export function createPostService({
  posts,
  likes,
  notifications,
  users,
  now = () => new Date(),
}) {
  const markLiked = async (list, viewerId) => {
    const liked = new Set(await likes.likedPostIds(viewerId));
    return list.map((post) => ({ ...post, curtido: liked.has(post.id) }));
  };

  const findOrFail = async (postId) => {
    const post = await posts.findById(postId);
    if (!post) throw notFound('Post não encontrado.');
    return post;
  };

  const notifyAuthor = async (post, autorId, tipo, conteudo) => {
    if (post.autor.id === autorId) return;
    await notifications.create({ destinatarioId: post.autor.id, autorId, tipo, conteudo, postId: post.id });
  };

  // Quem foi marcado com @ recebe aviso; o autor do post respondido já recebe o de comentário.
  const notifyMentions = async (texto, { id, autorId, pai }) => {
    const nomes = extractMentions(texto ?? '').slice(0, MAX_MARCACOES);
    if (nomes.length === 0) return;
    const marcados = (await users.findByNames(nomes))
      .filter((u) => u.id !== autorId && u.id !== pai?.autor.id);
    for (const marcado of marcados) {
      await notifications.create({
        destinatarioId: marcado.id,
        autorId,
        tipo: 'mention',
        conteudo: pai ? 'marcou você em um comentário' : 'marcou você em um post',
        postId: id,
      });
    }
  };

  return {
    async forYou(viewerId) {
      // Os mais recentes primeiro: quem acabou de postar aparece no topo.
      return markLiked(await posts.listLatest(), viewerId);
    },

    async following(viewerId) {
      return markLiked(await posts.listFromFollowed(viewerId), viewerId);
    },

    async repliesByAuthor(autorId, viewerId) {
      return markLiked(await posts.listRepliesByAuthor(autorId), viewerId);
    },

    async byHashtag(tag, viewerId) {
      const limpa = (tag ?? '').trim().replace(/^#/, '').toLowerCase();
      if (!limpa) throw badRequest('Hashtag inválida.');
      return markLiked(await posts.listByHashtag(limpa), viewerId);
    },

    // O post fixado vem primeiro; os outros seguem do mais novo para o mais antigo.
    async byAuthor(autorId, viewerId) {
      const list = await posts.listByAuthor(autorId);
      return markLiked([...list.filter((p) => p.fixado), ...list.filter((p) => !p.fixado)], viewerId);
    },

    async get(postId, viewerId) {
      const post = await findOrFail(postId);
      const [curtido, pai, respostas] = await Promise.all([
        likes.hasLiked(postId, viewerId),
        post.parentId ? posts.findById(post.parentId) : null,
        posts.listReplies(postId),
      ]);
      const primeiras = await posts.listFirstReplies(respostas.map((r) => r.id));
      const [paiMarcado = null] = pai ? await markLiked([pai], viewerId) : [];
      const primeirasMarcadas = new Map(
        (await markLiked([...primeiras.values()], viewerId)).map((p) => [p.parentId, p]),
      );
      return {
        post: { ...post, curtido },
        pai: paiMarcado,
        respostas: (await markLiked(respostas, viewerId)).map((r) => ({
          ...r,
          primeiraResposta: primeirasMarcadas.get(r.id) ?? null,
        })),
      };
    },

    // Serve para posts e respostas (com parentId). Música e imagem são opcionais; com música, a nota é obrigatória.
    async create(autorId, body) {
      const data = pick(body, CREATE_FIELDS);
      if (data.texto !== undefined) data.texto = String(data.texto).trim();
      const parentId = parseParentId(body.parentId);
      const imagemProporcao = parseProporcao(data.imagemProporcao, Boolean(data.imagemUrl));
      if (imagemProporcao !== undefined) data.imagemProporcao = imagemProporcao;
      const hasMusic = Boolean(data.musicName || data.albumName);

      if (hasMusic) {
        const nota = parseNota(data.nota);
        if (nota === null) throw badRequest('Dê uma nota de 0 a 5 estrelas.');
        if (!isValidNota(nota)) throw badRequest('A nota vai de 0 a 5 estrelas, de meia em meia.');
        data.nota = nota;
      } else {
        if (!data.texto && !data.imagemUrl) throw badRequest('Escreva algo, escolha uma música ou adicione uma imagem.');
        data.nota = null;
      }
      if ((data.texto ?? '').length > TEXTO_MAX) throw badRequest(`O texto pode ter no máximo ${TEXTO_MAX} caracteres.`);

      const pai = parentId === undefined ? null : await findOrFail(parentId);
      const id = await posts.create({ ...data, ...(pai && { parentId }), autorId, data: now() });
      if (pai) await notifyAuthor(pai, autorId, 'comment', 'comentou no seu post');
      await notifyMentions(data.texto, { id, autorId, pai });
      return id;
    },

    async remove(postId, usuarioId) {
      const post = await findOrFail(postId);
      if (post.autor.id !== usuarioId) throw forbidden('Você só pode apagar seus próprios posts.');
      await posts.remove(postId);
    },

    async pin(postId, usuarioId) {
      const post = await findOrFail(postId);
      if (post.autor.id !== usuarioId) throw forbidden('Você só pode fixar seus próprios posts.');
      if (post.parentId) throw badRequest('Só dá para fixar posts, não comentários.');
      await users.setPinnedPost(usuarioId, postId);
    },

    async unpin(postId, usuarioId) {
      const post = await findOrFail(postId);
      if (post.autor.id !== usuarioId) throw forbidden('Você só pode desafixar seus próprios posts.');
      if (post.fixado) await users.setPinnedPost(usuarioId, null);
    },

    async like(postId, usuarioId) {
      const post = await findOrFail(postId);
      if (await likes.hasLiked(postId, usuarioId)) return post.likes;

      await likes.add({ postId, usuarioId });
      await notifyAuthor(post, usuarioId, 'like', 'curtiu seu post');
      return likes.countByPost(postId);
    },

    async unlike(postId, usuarioId) {
      const post = await findOrFail(postId);
      if (!(await likes.hasLiked(postId, usuarioId))) return post.likes;

      await likes.remove(postId, usuarioId);
      await notifications.removeLike(postId, usuarioId);
      return likes.countByPost(postId);
    },
  };
}
