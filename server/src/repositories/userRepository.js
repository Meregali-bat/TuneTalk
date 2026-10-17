import md5 from 'md5';

export const PUBLIC_USER_SELECT = { id: true, nome: true, fotoPerfil: true, bio: true };

export function createUserRepository(prisma) {
  return {
    async findByCredentials(email, senha) {
      const user = await prisma.usuario.findUnique({ where: { email } });
      if (!user || user.senha !== md5(senha)) return null;
      return { id: user.id, nome: user.nome, email: user.email, fotoPerfil: user.fotoPerfil, bio: user.bio };
    },

    async existsByNameOrEmail(nome, email) {
      const user = await prisma.usuario.findFirst({
        where: { OR: [{ nome }, { email }] },
        select: { id: true },
      });
      return user !== null;
    },

    async create({ nome, email, senha, fotoPerfil }) {
      const user = await prisma.usuario.create({
        data: { nome, email, senha: md5(senha), fotoPerfil },
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
