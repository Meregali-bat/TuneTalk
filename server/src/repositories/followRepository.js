import { PUBLIC_USER_SELECT } from './userRepository.js';

export function createFollowRepository(prisma) {
  const pair = (seguidorId, seguidoId) => ({ seguidorId_seguidoId: { seguidorId, seguidoId } });

  return {
    async isFollowing(seguidorId, seguidoId) {
      const follow = await prisma.seguimento.findUnique({ where: pair(seguidorId, seguidoId) });
      return follow !== null;
    },

    async follow(seguidorId, seguidoId) {
      await prisma.seguimento.create({ data: { seguidorId, seguidoId } });
    },

    async unfollow(seguidorId, seguidoId) {
      await prisma.seguimento.delete({ where: pair(seguidorId, seguidoId) });
    },

    async followingIds(usuarioId) {
      const rows = await prisma.seguimento.findMany({ where: { seguidorId: usuarioId }, select: { seguidoId: true } });
      return rows.map((row) => row.seguidoId);
    },

    async listFollowing(usuarioId) {
      const rows = await prisma.seguimento.findMany({
        where: { seguidorId: usuarioId },
        select: { seguido: { select: PUBLIC_USER_SELECT } },
      });
      return rows.map((row) => row.seguido);
    },

    async listFollowers(usuarioId) {
      const rows = await prisma.seguimento.findMany({
        where: { seguidoId: usuarioId },
        select: { seguidor: { select: PUBLIC_USER_SELECT } },
      });
      return rows.map((row) => row.seguidor);
    },

    countFollowing(usuarioId) {
      return prisma.seguimento.count({ where: { seguidorId: usuarioId } });
    },

    countFollowers(usuarioId) {
      return prisma.seguimento.count({ where: { seguidoId: usuarioId } });
    },
  };
}
