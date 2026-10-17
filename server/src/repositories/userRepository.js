import md5 from 'md5';

export const PUBLIC_USER_SELECT = { id: true, nome: true, fotoPerfil: true, bio: true };

const sameText = (value) => ({ equals: value, mode: 'insensitive' });

export function createUserRepository(prisma) {
  return {
    // Busca sem diferenciar maiúsculas: emails antigos foram gravados como digitados.
    async findByCredentials(email, senha) {
      const user = await prisma.usuario.findFirst({ where: { email: sameText(email) } });
      if (!user || user.senha !== md5(senha)) return null;
      return { id: user.id, nome: user.nome, email: user.email, fotoPerfil: user.fotoPerfil, bio: user.bio };
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

    async create({ email, senha, fotoPerfil }) {
      const user = await prisma.usuario.create({
        data: { email, senha: md5(senha), fotoPerfil },
        select: { id: true },
      });
      return user.id;
    },

    findById(id) {
      return prisma.usuario.findUnique({ where: { id }, select: PUBLIC_USER_SELECT });
    },

    async update(id, { nome, fotoPerfil, bio }) {
      await prisma.usuario.update({ where: { id }, data: { nome, fotoPerfil, bio } });
    },
  };
}
