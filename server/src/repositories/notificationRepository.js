const toNotification = ({ createdAt, ...rest }) => ({ ...rest, data: createdAt.toISOString() });

export function createNotificationRepository(prisma) {
  return {
    async listForUser(usuarioId) {
      const rows = await prisma.notificacao.findMany({
        where: { destinatarioId: usuarioId },
        orderBy: { id: 'desc' },
        select: {
          id: true,
          tipo: true,
          conteudo: true,
          lida: true,
          postId: true,
          createdAt: true,
          autor: { select: { id: true, nome: true, fotoPerfil: true } },
        },
      });
      return rows.map(toNotification);
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
