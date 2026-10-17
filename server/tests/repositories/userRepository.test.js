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

  it('create grava a senha em md5 e devolve o id', async () => {
    const id = await repo.create({ nome: 'Ana', email: 'ana@x.com', senha: 'Senha!1', fotoPerfil: 'f.png' });

    const saved = await db.prisma.usuario.findUnique({ where: { id } });
    expect(saved).toMatchObject({ nome: 'Ana', email: 'ana@x.com', senha: md5('Senha!1'), fotoPerfil: 'f.png' });
  });

  describe('findByCredentials', () => {
    beforeEach(() => repo.create({ nome: 'Ana', email: 'ana@x.com', senha: 'Senha!1', fotoPerfil: 'f.png' }));

    it('devolve o usuário (sem a senha) quando email e senha batem', async () => {
      const user = await repo.findByCredentials('ana@x.com', 'Senha!1');
      expect(user).toEqual({ id: expect.any(Number), nome: 'Ana', email: 'ana@x.com', fotoPerfil: 'f.png', bio: null });
    });

    it('devolve null com senha errada ou email inexistente', async () => {
      expect(await repo.findByCredentials('ana@x.com', 'errada')).toBeNull();
      expect(await repo.findByCredentials('nada@x.com', 'Senha!1')).toBeNull();
    });
  });

  it('existsByNameOrEmail detecta nome ou email já usados', async () => {
    await factory.user({ nome: 'Ana', email: 'ana@x.com' });
    expect(await repo.existsByNameOrEmail('Ana', 'outro@x.com')).toBe(true);
    expect(await repo.existsByNameOrEmail('Outra', 'ana@x.com')).toBe(true);
    expect(await repo.existsByNameOrEmail('Outra', 'outro@x.com')).toBe(false);
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
