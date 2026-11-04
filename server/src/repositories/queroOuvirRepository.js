const SELECT = { id: true, tipo: true, titulo: true, artista: true, capa: true, releaseDate: true, preview: true, createdAt: true };
const paraApi = ({ createdAt, ...item }) => ({ ...item, data: createdAt.toISOString() });

// Lista "Quero ouvir" de cada pessoa. Os itens se reconhecem pela `chave` (ver shared/obra.js).
export function createQueroOuvirRepository(prisma) {
  return {
    async listar(usuarioId) {
      const rows = await prisma.queroOuvir.findMany({
        where: { usuarioId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: SELECT,
      });
      return rows.map(paraApi);
    },

    // Guardar de novo o mesmo disco não duplica.
    async adicionar(usuarioId, item) {
      const row = await prisma.queroOuvir.upsert({
        where: { usuarioId_chave: { usuarioId, chave: item.chave } },
        create: { usuarioId, ...item },
        update: {},
        select: SELECT,
      });
      return paraApi(row);
    },

    async remover(usuarioId, chave) {
      await prisma.queroOuvir.deleteMany({ where: { usuarioId, chave } });
    },

    async chaves(usuarioId) {
      const rows = await prisma.queroOuvir.findMany({ where: { usuarioId }, select: { chave: true } });
      return new Set(rows.map((row) => row.chave));
    },
  };
}
