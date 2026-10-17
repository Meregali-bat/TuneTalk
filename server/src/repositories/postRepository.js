const POST_INCLUDE = {
  autor: { select: { id: true, nome: true, fotoPerfil: true } },
  _count: { select: { comentarios: true, curtidas: true } },
};

const normalizeType = (postType) => (postType === 'album' ? 'album' : 'música');

const toNota = (nota) => {
  const value = Number(nota);
  return Number.isFinite(value) ? value : 0;
};

export function toPost(row) {
  const tipo = normalizeType(row.postType);
  const isAlbum = tipo === 'album';
  return {
    id: row.id,
    texto: row.texto,
    likes: row._count.curtidas,
    nota: row.nota,
    data: row.createdAt.toISOString(),
    quantidadeComentarios: row._count.comentarios,
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
      return findPosts({ orderBy: { createdAt: 'desc' }, take: 20 });
    },

    listByAuthor(autorId) {
      return findPosts({ where: { autorId }, orderBy: { id: 'desc' } });
    },

    listFromFollowed(usuarioId) {
      return findPosts({
        where: { autor: { seguidores: { some: { seguidorId: usuarioId } } } },
        orderBy: { id: 'desc' },
      });
    },

    async findById(id) {
      const row = await prisma.post.findUnique({ where: { id }, include: POST_INCLUDE });
      return row ? toPost(row) : null;
    },

    async create(post) {
      const created = await prisma.post.create({
        data: {
          autorId: post.autorId,
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

    // Comentários, curtidas e notificações do post são apagados em cascata pelo banco.
    async remove(id) {
      await prisma.post.delete({ where: { id } });
    },
  };
}
