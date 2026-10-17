const POST_INCLUDE = {
  autor: { select: { id: true, nome: true, fotoPerfil: true } },
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
    autor: row.autor,
  };
}

export function createPostRepository(prisma) {
  const findPosts = async (args) => (await prisma.post.findMany({ ...args, include: POST_INCLUDE })).map(toPost);

  return {
    listLatest() {
      return findPosts({ where: TOP_LEVEL, orderBy: { createdAt: 'desc' }, take: 20 });
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

    // Em ordem de conversa: a primeira resposta fica no topo.
    listReplies(parentId) {
      return findPosts({ where: { parentId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
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
