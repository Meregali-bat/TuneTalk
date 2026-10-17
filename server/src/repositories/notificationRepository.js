export function createNotificationRepository(prisma) {
  return {
    listForUser(usuarioId) {
      return prisma.notificacao.findMany({
        where: { destinatarioId: usuarioId },
        orderBy: { id: 'desc' },
        select: {
          id: true,
          tipo: true,
          conteudo: true,
          lida: true,
          postId: true,
          autor: { select: { id: true, nome: true, fotoPerfil: true } },
        },
      });
    },

    countUnread(usuarioId) {
      return prisma.notificacao.count({ where: { destinatarioId: usuarioId, lida: false } });
    },

    async markAllRead(usuarioId) {
      await prisma.notificacao.updateMany({ where: { destinatarioId: usuarioId, lida: false }, data: { lida: true } });
    },

    async create({ destinatarioId, autorId, tipo, conteudo, postId = null }) {
      await prisma.notificacao.create({ data: { destinatarioId, autorId, tipo, conteudo, postId } });
    },

    async removeLike(postId, usuarioId) {
      await prisma.notificacao.deleteMany({ where: { postId, autorId: usuarioId, tipo: 'like' } });
    },
  };
}
