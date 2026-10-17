import { badRequest, forbidden, notFound } from '../errors.js';
import { isValidNota, parseNota } from '../../../shared/rating.js';

const TEXTO_MAX = 500;

const CREATE_FIELDS = [
  'texto', 'musicName', 'artistName', 'posterMusica', 'albumName',
  'posterAlbum', 'postType', 'releaseDate', 'nota', 'musicPreview',
];

export function fisherYatesShuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

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
  shuffle = fisherYatesShuffle,
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

  return {
    async forYou(viewerId) {
      return markLiked(shuffle(await posts.listLatest()), viewerId);
    },

    async following(viewerId) {
      return markLiked(await posts.listFromFollowed(viewerId), viewerId);
    },

    async byAuthor(autorId, viewerId) {
      return markLiked(await posts.listByAuthor(autorId), viewerId);
    },

    async get(postId, viewerId) {
      const post = await findOrFail(postId);
      const [curtido, pai, respostas] = await Promise.all([
        likes.hasLiked(postId, viewerId),
        post.parentId ? posts.findById(post.parentId) : null,
        posts.listReplies(postId),
      ]);
      const [paiMarcado = null] = pai ? await markLiked([pai], viewerId) : [];
      return { post: { ...post, curtido }, pai: paiMarcado, respostas: await markLiked(respostas, viewerId) };
    },

    // Serve para posts e respostas (com parentId). A música é opcional; com ela, a nota é obrigatória.
    async create(autorId, body) {
      const data = pick(body, CREATE_FIELDS);
      if (data.texto !== undefined) data.texto = String(data.texto).trim();
      const parentId = parseParentId(body.parentId);
      const hasMusic = Boolean(data.musicName || data.albumName);

      if (hasMusic) {
        const nota = parseNota(data.nota);
        if (nota === null) throw badRequest('Dê uma nota de 0 a 10.');
        if (!isValidNota(nota)) throw badRequest('A nota deve ser um número inteiro de 0 a 10.');
        data.nota = nota;
      } else {
        if (!data.texto) throw badRequest('Escreva algo ou escolha uma música.');
        data.nota = null;
      }
      if ((data.texto ?? '').length > TEXTO_MAX) throw badRequest(`O texto pode ter no máximo ${TEXTO_MAX} caracteres.`);

      const pai = parentId === undefined ? null : await findOrFail(parentId);
      const id = await posts.create({ ...data, ...(pai && { parentId }), autorId, data: now() });
      if (pai) await notifyAuthor(pai, autorId, 'comment', 'comentou no seu post');
      return id;
    },

    async remove(postId, usuarioId) {
      const post = await findOrFail(postId);
      if (post.autor.id !== usuarioId) throw forbidden('Você só pode apagar seus próprios posts.');
      await posts.remove(postId);
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
