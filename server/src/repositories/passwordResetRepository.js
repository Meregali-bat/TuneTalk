export function createPasswordResetRepository(prisma) {
  return {
    async create({ usuarioId, tokenHash, expiraEm }) {
      await prisma.redefinicaoSenha.create({ data: { usuarioId, tokenHash, expiraEm } });
    },

    findValid(tokenHash, agora) {
      return prisma.redefinicaoSenha.findFirst({
        where: { tokenHash, usadoEm: null, expiraEm: { gt: agora } },
        select: { id: true, usuarioId: true },
      });
    },

    // Marca como usado só se ainda não foi: dois cliques no mesmo link não trocam a senha duas vezes.
    async claim(id, agora) {
      const { count } = await prisma.redefinicaoSenha.updateMany({ where: { id, usadoEm: null }, data: { usadoEm: agora } });
      return count === 1;
    },

    countSince(usuarioId, desde) {
      return prisma.redefinicaoSenha.count({ where: { usuarioId, createdAt: { gte: desde } } });
    },

    async deleteForUser(usuarioId) {
      await prisma.redefinicaoSenha.deleteMany({ where: { usuarioId } });
    },
  };
}
