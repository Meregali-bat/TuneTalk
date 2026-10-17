export function createLikeRepository(prisma) {
  const key = (postId, usuarioId) => ({ postId_usuarioId: { postId, usuarioId } });

  return {
    async hasLiked(postId, usuarioId) {
      const like = await prisma.curtida.findUnique({ where: key(postId, usuarioId) });
      return like !== null;
    },

    async add({ postId, usuarioId }) {
      await prisma.curtida.create({ data: { postId, usuarioId } });
    },

    async remove(postId, usuarioId) {
      await prisma.curtida.delete({ where: key(postId, usuarioId) });
    },

    async likedPostIds(usuarioId) {
      const rows = await prisma.curtida.findMany({ where: { usuarioId }, select: { postId: true } });
      return rows.map((row) => row.postId);
    },

    countByPost(postId) {
      return prisma.curtida.count({ where: { postId } });
    },
  };
}
