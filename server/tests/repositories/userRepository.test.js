import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import md5 from 'md5';
import { createTestDatabase, seed } from '../helpers/testDatabase.js';
import { createUserRepository } from '../../src/repositories/userRepository.js';

describe('userRepository (Postgres)', () => {
  let db;
  let repo;
  let factory;

  beforeAll(async () => {
    db = await createTestDatabase();
    repo = createUserRepository(db.prisma);
    factory = seed(db.prisma);
  });
  beforeEach(() => db.reset());
  afterAll(() => db.close());

  it('create grava a senha em md5, sem nome de usuário, e devolve o id', async () => {
    const id = await repo.create({ email: 'ana@x.com', senha: 'Senha!1', fotoPerfil: 'f.png' });

    const saved = await db.prisma.usuario.findUnique({ where: { id } });
    expect(saved).toMatchObject({ nome: null, email: 'ana@x.com', senha: md5('Senha!1'), fotoPerfil: 'f.png' });
    expect(await repo.findById(id)).toMatchObject({ id, nome: null });
  });

  describe('findByCredentials', () => {
    beforeEach(async () => {
      const id = await repo.create({ email: 'ana@x.com', senha: 'Senha!1', fotoPerfil: 'f.png' });
      await repo.update(id, { nome: 'Ana' });
    });

    it('devolve o usuário (sem a senha) quando email e senha batem', async () => {
      const user = await repo.findByCredentials('ana@x.com', 'Senha!1');
      expect(user).toEqual({ id: expect.any(Number), nome: 'Ana', email: 'ana@x.com', fotoPerfil: 'f.png', bio: null });
    });

    it('encontra o email ignorando maiúsculas (inclusive emails antigos gravados com maiúscula)', async () => {
      await factory.user({ email: 'Legado@X.com', senha: md5('Senha!1') });
      expect(await repo.findByCredentials('ANA@x.com', 'Senha!1')).toMatchObject({ nome: 'Ana' });
      expect(await repo.findByCredentials('legado@x.com', 'Senha!1')).toMatchObject({ email: 'Legado@X.com' });
    });

    it('devolve null com senha errada ou email inexistente', async () => {
      expect(await repo.findByCredentials('ana@x.com', 'errada')).toBeNull();
      expect(await repo.findByCredentials('nada@x.com', 'Senha!1')).toBeNull();
    });
  });

  it('existsByEmail detecta email já cadastrado, ignorando maiúsculas', async () => {
    await factory.user({ email: 'Ana@x.com' });
    expect(await repo.existsByEmail('ana@x.com')).toBe(true);
    expect(await repo.existsByEmail('outro@x.com')).toBe(false);
  });

  it('isNameTaken ignora maiúsculas e o próprio usuário', async () => {
    const ana = await factory.user({ nome: 'ana.souza' });
    expect(await repo.isNameTaken('Ana.Souza')).toBe(true);
    expect(await repo.isNameTaken('ana.souza', ana.id)).toBe(false);
    expect(await repo.isNameTaken('bia')).toBe(false);
  });

  it('o banco não aceita dois usuários com o mesmo nome', async () => {
    await factory.user({ nome: 'ana' });
    await expect(factory.user({ nome: 'ana' })).rejects.toMatchObject({ code: 'P2002' });
  });

  it('findById devolve o usuário público ou null', async () => {
    const ana = await factory.user({ nome: 'Ana', bio: 'oi' });
    expect(await repo.findById(ana.id)).toEqual({ id: ana.id, nome: 'Ana', fotoPerfil: ana.fotoPerfil, bio: 'oi' });
    expect(await repo.findById(9999)).toBeNull();
  });

  it('update altera nome, foto e bio', async () => {
    const ana = await factory.user();
    await repo.update(ana.id, { nome: 'Novo', fotoPerfil: 'n.png', bio: 'bio' });
    expect(await repo.findById(ana.id)).toEqual({ id: ana.id, nome: 'Novo', fotoPerfil: 'n.png', bio: 'bio' });
  });
});
