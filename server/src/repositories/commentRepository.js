export function createCommentRepository(prisma) {
  return {
    async create({ postId, usuarioId, texto }) {
      const comment = await prisma.comentario.create({
        data: { postId, autorId: usuarioId, texto },
        select: { id: true },
      });
      return comment.id;
    },

    listByPost(postId) {
      return prisma.comentario.findMany({
        where: { postId },
        orderBy: { id: 'desc' },
        select: { id: true, texto: true, autor: { select: { id: true, nome: true, fotoPerfil: true } } },
      });
    },
  };
}
