import { hasHashtag } from '../../../shared/mentions.js';

const POST_INCLUDE = {
  autor: { select: { id: true, nome: true, fotoPerfil: true, postFixadoId: true, fundadorDesde: true, mostrarSeloFundador: true } },
  _count: { select: { respostas: true, curtidas: true } },
};

// Feeds e perfis mostram só posts principais; respostas aparecem dentro do post pai.
const TOP_LEVEL = { parentId: null };

const normalizeType = (postType) => (postType === 'album' ? 'album' : 'música');

const toNota = (nota) => {
  if (nota === null || nota === undefined) return null;
  const value = Number(nota);
  return Number.isFinite(value) ? value : null;
};

export function toPost(row) {
  const hasMusic = Boolean(row.musicName || row.albumName);
  const tipo = hasMusic ? normalizeType(row.postType) : null;
  const isAlbum = tipo === 'album';
  return {
    id: row.id,
    parentId: row.parentId ?? null,
    texto: row.texto,
    likes: row._count.curtidas,
    nota: row.nota ?? null,
    data: row.createdAt.toISOString(),
    quantidadeComentarios: row._count.respostas,
    tipo,
    titulo: isAlbum ? row.albumName : row.musicName,
    artista: row.artistName,
    capa: isAlbum ? row.posterAlbum : row.posterMusica,
    releaseDate: row.releaseDate,
    preview: row.musicPreview ?? null,
    imagem: row.imagemUrl ?? null,
    imagemProporcao: row.imagemProporcao ?? null,
    fixado: row.autor.postFixadoId === row.id,
    autor: { id: row.autor.id, nome: row.autor.nome, fotoPerfil: row.autor.fotoPerfil, fundador: Boolean(row.autor.fundadorDesde) && row.autor.mostrarSeloFundador !== false },
  };
}

export function createPostRepository(prisma) {
  const findPosts = async (args) => (await prisma.post.findMany({ ...args, include: POST_INCLUDE })).map(toPost);

  return {
    listLatest(limit = 50) {
      return findPosts({ where: TOP_LEVEL, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit });
    },

    listByAuthor(autorId) {
      return findPosts({ where: { ...TOP_LEVEL, autorId }, orderBy: { id: 'desc' } });
    },

    listFromFollowed(usuarioId) {
      return findPosts({
        where: { ...TOP_LEVEL, autor: { seguidores: { some: { seguidorId: usuarioId } } } },
        orderBy: { id: 'desc' },
      });
    },

    // Posts e comentários com a hashtag inteira (o banco filtra por "contém"; aqui conferimos a tag).
    async listByHashtag(tag, limit = 50) {
      const candidatos = await findPosts({
        where: { texto: { contains: `#${tag}`, mode: 'insensitive' } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit * 2,
      });
      return candidatos.filter((p) => hasHashtag(p.texto, tag)).slice(0, limit);
    },

    // Em ordem de conversa: a primeira resposta fica no topo.
    listReplies(parentId) {
      return findPosts({ where: { parentId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    },

    // Primeira resposta de cada comentário (a mais antiga), para mostrar a conversa como no Twitter.
    async listFirstReplies(parentIds) {
      if (parentIds.length === 0) return new Map();
      const rows = await findPosts({
        where: { parentId: { in: parentIds } },
        orderBy: [{ parentId: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        distinct: ['parentId'],
      });
      return new Map(rows.map((post) => [post.parentId, post]));
    },

    async findById(id) {
      const row = await prisma.post.findUnique({ where: { id }, include: POST_INCLUDE });
      return row ? toPost(row) : null;
    },

    async create(post) {
      const created = await prisma.post.create({
        data: {
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
          nota: toNota(post.nota),
          musicPreview: post.musicPreview ?? null,
          imagemUrl: post.imagemUrl ?? null,
          imagemProporcao: post.imagemProporcao ?? null,
          createdAt: post.data,
        },
        select: { id: true },
      });
      return created.id;
    },

    // Respostas (e as respostas delas), curtidas e notificações são apagadas em cascata pelo banco.
    async remove(id) {
      await prisma.post.delete({ where: { id } });
    },
  };
}
