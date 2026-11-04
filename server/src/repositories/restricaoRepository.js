import { PUBLIC_USER_SELECT } from './userRepository.js';

// Bloqueios e silêncios entre pessoas.
export function createRestricaoRepository(prisma) {
  return {
    // Bloquear desfaz o seguir nos dois sentidos.
    async bloquear(bloqueadorId, bloqueadoId) {
      await prisma.$transaction([
        prisma.bloqueio.upsert({
          where: { bloqueadorId_bloqueadoId: { bloqueadorId, bloqueadoId } },
          create: { bloqueadorId, bloqueadoId },
          update: {},
        }),
        prisma.seguimento.deleteMany({
          where: {
            OR: [
              { seguidorId: bloqueadorId, seguidoId: bloqueadoId },
              { seguidorId: bloqueadoId, seguidoId: bloqueadorId },
            ],
          },
        }),
      ]);
    },

    async desbloquear(bloqueadorId, bloqueadoId) {
      await prisma.bloqueio.deleteMany({ where: { bloqueadorId, bloqueadoId } });
    },

    async silenciar(usuarioId, silenciadoId) {
      await prisma.silencio.upsert({
        where: { usuarioId_silenciadoId: { usuarioId, silenciadoId } },
        create: { usuarioId, silenciadoId },
        update: {},
      });
    },

    async dessilenciar(usuarioId, silenciadoId) {
      await prisma.silencio.deleteMany({ where: { usuarioId, silenciadoId } });
    },

    // Como `viewerId` se relaciona com `outroId`.
    async relacao(viewerId, outroId) {
      const [bloqueado, meBloqueou, silenciado] = await Promise.all([
        prisma.bloqueio.count({ where: { bloqueadorId: viewerId, bloqueadoId: outroId } }),
        prisma.bloqueio.count({ where: { bloqueadorId: outroId, bloqueadoId: viewerId } }),
        prisma.silencio.count({ where: { usuarioId: viewerId, silenciadoId: outroId } }),
      ]);
      return { bloqueado: bloqueado > 0, meBloqueou: meBloqueou > 0, silenciado: silenciado > 0 };
    },

    // Pessoas cujos posts e notificações `viewerId` não vê: quem ele silenciou, quem ele bloqueou
    // e quem o bloqueou.
    async ocultosPara(viewerId) {
      const [silencios, bloqueios] = await Promise.all([
        prisma.silencio.findMany({ where: { usuarioId: viewerId }, select: { silenciadoId: true } }),
        prisma.bloqueio.findMany({
          where: { OR: [{ bloqueadorId: viewerId }, { bloqueadoId: viewerId }] },
          select: { bloqueadorId: true, bloqueadoId: true },
        }),
      ]);
      const ids = new Set(silencios.map((s) => s.silenciadoId));
      for (const b of bloqueios) ids.add(b.bloqueadorId === viewerId ? b.bloqueadoId : b.bloqueadorId);
      return [...ids];
    },

    // Para a lista "Bloqueados e silenciados" (e desfazer de lá).
    async listar(usuarioId) {
      const [bloqueios, silencios] = await Promise.all([
        prisma.bloqueio.findMany({
          where: { bloqueadorId: usuarioId },
          orderBy: { createdAt: 'desc' },
          select: { bloqueado: { select: PUBLIC_USER_SELECT } },
        }),
        prisma.silencio.findMany({
          where: { usuarioId },
          orderBy: { createdAt: 'desc' },
          select: { silenciado: { select: PUBLIC_USER_SELECT } },
        }),
      ]);
      return { bloqueados: bloqueios.map((b) => b.bloqueado), silenciados: silencios.map((s) => s.silenciado) };
    },
  };
}
