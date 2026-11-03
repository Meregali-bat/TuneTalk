export const PUBLIC_USER_SELECT = {
  id: true, nome: true, nomeExibicao: true, fotoPerfil: true, bannerUrl: true, bio: true,
};

const sameText = (value) => ({ equals: value, mode: 'insensitive' });

export function createUserRepository(prisma) {
  return {
    // Inclui o hash da senha: só para o login conferir. Busca sem diferenciar maiúsculas,
    // porque emails antigos foram gravados como digitados.
    findAuthByEmail(email) {
      return prisma.usuario.findFirst({
        where: { email: sameText(email) },
        select: { id: true, nome: true, email: true, senha: true },
      });
    },

    findAuthById(id) {
      return prisma.usuario.findUnique({ where: { id }, select: { id: true, senha: true } });
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

    findById(id) {
      return prisma.usuario.findUnique({ where: { id }, select: PUBLIC_USER_SELECT });
    },

    async update(id, { nome, nomeExibicao, fotoPerfil, bannerUrl, bio }) {
      await prisma.usuario.update({ where: { id }, data: { nome, nomeExibicao, fotoPerfil, bannerUrl, bio } });
    },
  };
}
