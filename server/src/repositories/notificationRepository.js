import { TipoNotificacao } from '../generated/prisma/enums.js';

// Só os tipos de aviso que esta versão do app conhece. O banco pode ter tipos mais novos: o site de
// teste divide o banco entre branches, e voltar a uma versão anterior na Vercel não desfaz as
// migrations. Ler um tipo desconhecido derrubaria a lista inteira, então ele fica de fora.
const TIPOS_CONHECIDOS = { in: Object.values(TipoNotificacao) };

const toNotification = ({ createdAt, ...rest }) => ({ ...rest, data: createdAt.toISOString() });

export function createNotificationRepository(prisma) {
  return {
    async listForUser(usuarioId) {
      const rows = await prisma.notificacao.findMany({
        where: { destinatarioId: usuarioId, tipo: TIPOS_CONHECIDOS },
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
      return prisma.notificacao.count({ where: { destinatarioId: usuarioId, lida: false, tipo: TIPOS_CONHECIDOS } });
    },

    async markAllRead(usuarioId) {
      await prisma.notificacao.updateMany({ where: { destinatarioId: usuarioId, lida: false }, data: { lida: true } });
    },

    async create({ destinatarioId, autorId, tipo, conteudo, postId = null }) {
      await prisma.notificacao.create({ data: { destinatarioId, autorId, tipo, conteudo, postId } });
    },

    async exists(destinatarioId, tipo) {
      return (await prisma.notificacao.count({ where: { destinatarioId, tipo } })) > 0;
    },

    // Já recebeu esse tipo de aviso desde tal data? (ex.: o de Natal, uma vez por ano)
    async existsDesde(destinatarioId, tipo, desde) {
      return (await prisma.notificacao.count({ where: { destinatarioId, tipo, createdAt: { gte: desde } } })) > 0;
    },

    async removeLike(postId, usuarioId) {
      await prisma.notificacao.deleteMany({ where: { postId, autorId: usuarioId, tipo: 'like' } });
    },
  };
}
