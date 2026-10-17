import { badRequest, forbidden, notFound } from '../errors.js';

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

export function createPostService({
  posts,
  likes,
  comments,
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
      const [curtido, comentarios] = await Promise.all([
        likes.hasLiked(postId, viewerId),
        comments.listByPost(postId),
      ]);
      return { post: { ...post, curtido }, comentarios };
    },

    async create(autorId, body) {
      const data = pick(body, CREATE_FIELDS);
      if (!data.musicName && !data.albumName) throw badRequest('Escolha uma música ou álbum.');
      return posts.create({ ...data, autorId, data: now() });
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

    async comment(postId, usuarioId, texto) {
      const clean = (texto ?? '').trim();
      if (!clean) throw badRequest('O comentário não pode ser vazio.');

      const post = await findOrFail(postId);
      const id = await comments.create({ postId, usuarioId, texto: clean });
      await notifyAuthor(post, usuarioId, 'comment', 'comentou no seu post');
      return id;
    },
  };
}
