export const PUBLIC_USER_SELECT = {
  id: true, nome: true, nomeExibicao: true, fotoPerfil: true, bannerUrl: true, bio: true, fundadorDesde: true, mostrarSeloFundador: true,
};

const sameText = (value) => ({ equals: value, mode: 'insensitive' });

export function createUserRepository(prisma) {
  return {
    // Inclui o hash da senha: só para o login conferir. Busca sem diferenciar maiúsculas,
    // porque emails antigos foram gravados como digitados.
    findAuthByEmail(email) {
      return prisma.usuario.findFirst({
        where: { email: sameText(email) },
        select: { id: true, nome: true, email: true, senha: true, fotoPerfil: true, veterano: true, fundadorDesde: true },
      });
    },

    findAuthById(id) {
      return prisma.usuario.findUnique({ where: { id }, select: { id: true, senha: true } });
    },

    // Quem começa com o texto vem primeiro; depois quem só contém. Contas sem nome ficam de fora.
    async search(texto, limite = 20) {
      const campo = (op) => ({
        nome: { not: null },
        OR: [{ nome: { [op]: texto, mode: 'insensitive' } }, { nomeExibicao: { [op]: texto, mode: 'insensitive' } }],
      });
      const comeco = await prisma.usuario.findMany({
        where: campo('startsWith'), select: PUBLIC_USER_SELECT, orderBy: { nome: 'asc' }, take: limite,
      });
      if (comeco.length >= limite) return comeco;
      const resto = await prisma.usuario.findMany({
        where: { ...campo('contains'), id: { notIn: comeco.map((u) => u.id) } },
        select: PUBLIC_USER_SELECT,
        orderBy: { nome: 'asc' },
        take: limite - comeco.length,
      });
      return [...comeco, ...resto];
    },

    // Para as marcações (@usuario): acha as contas pelos nomes, sem diferenciar maiúsculas.
    findByNames(nomes) {
      if (nomes.length === 0) return Promise.resolve([]);
      return prisma.usuario.findMany({
        where: { OR: nomes.map((nome) => ({ nome: sameText(nome) })) },
        select: { id: true, nome: true },
      });
    },

    async activateFounder(id) {
      await prisma.usuario.update({ where: { id }, data: { fundadorDesde: new Date() } });
    },

    async setPinnedPost(id, postId) {
      await prisma.usuario.update({ where: { id }, data: { postFixadoId: postId } });
    },

    async updatePassword(id, senhaHash) {
      await prisma.usuario.update({ where: { id }, data: { senha: senhaHash } });
    },

    async existsByEmail(email) {
      const user = await prisma.usuario.findFirst({ where: { email: sameText(email) }, select: { id: true } });
      return user !== null;
    },

    async isNameTaken(nome, exceptId) {
      const user = await prisma.usuario.findFirst({
        where: { nome: sameText(nome), ...(exceptId ? { NOT: { id: exceptId } } : {}) },
        select: { id: true },
      });
      return user !== null;
    },

    async create({ email, senhaHash, fotoPerfil }) {
      const user = await prisma.usuario.create({
        data: { email, senha: senhaHash, fotoPerfil },
        select: { id: true },
      });
      return user.id;
    },

    async getFavorites(id) {
      return (await prisma.usuario.findUnique({ where: { id }, select: { favoritos: true } }))?.favoritos ?? null;
    },

    async setFavorites(id, favoritos) {
      await prisma.usuario.update({ where: { id }, data: { favoritos } });
    },

    findById(id) {
      return prisma.usuario.findUnique({ where: { id }, select: PUBLIC_USER_SELECT });
    },

    async update(id, { nome, nomeExibicao, fotoPerfil, bannerUrl, bio, mostrarSeloFundador }) {
      await prisma.usuario.update({
        where: { id }, data: { nome, nomeExibicao, fotoPerfil, bannerUrl, bio, mostrarSeloFundador },
      });
    },
  };
}
