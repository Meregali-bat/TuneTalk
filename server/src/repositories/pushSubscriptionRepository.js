// Aparelhos inscritos para receber avisos. O endpoint identifica o aparelho (é único).
export function createPushSubscriptionRepository(prisma) {
  return {
    // Mesmo aparelho de novo (ou passado para outra conta): atualiza em vez de duplicar.
    async save(usuarioId, { endpoint, p256dh, auth }) {
      await prisma.inscricaoPush.upsert({
        where: { endpoint },
        create: { usuarioId, endpoint, p256dh, auth },
        update: { usuarioId, p256dh, auth },
      });
    },

    async remove(usuarioId, endpoint) {
      await prisma.inscricaoPush.deleteMany({ where: { usuarioId, endpoint } });
    },

    // Aparelho que o serviço de push disse não existir mais.
    async removeEndpoint(endpoint) {
      await prisma.inscricaoPush.deleteMany({ where: { endpoint } });
    },

    listByUser(usuarioId) {
      return prisma.inscricaoPush.findMany({
        where: { usuarioId },
        select: { endpoint: true, p256dh: true, auth: true },
      });
    },
  };
}
