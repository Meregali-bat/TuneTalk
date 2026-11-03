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

  // A senha chega já transformada em hash (feito pelo serviço); o repositório só guarda.
  it('create grava o hash recebido, sem nome de usuário, e devolve o id', async () => {
    const id = await repo.create({ email: 'ana@x.com', senhaHash: '$2b$hash', fotoPerfil: 'f.png' });

    const saved = await db.prisma.usuario.findUnique({ where: { id } });
    expect(saved).toMatchObject({ nome: null, email: 'ana@x.com', senha: '$2b$hash', fotoPerfil: 'f.png' });
    expect(await repo.findById(id)).toMatchObject({ id, nome: null });
  });

  describe('findAuthByEmail', () => {
    it('devolve id, nome, email e o hash da senha', async () => {
      const id = await repo.create({ email: 'ana@x.com', senhaHash: '$2b$hash', fotoPerfil: 'f.png' });
      await repo.update(id, { nome: 'Ana' });
      expect(await repo.findAuthByEmail('ana@x.com')).toEqual({
        id, nome: 'Ana', email: 'ana@x.com', senha: '$2b$hash', veterano: false, fundadorDesde: null,
      });
    });

    it('ignora maiúsculas (inclusive emails antigos gravados com maiúscula)', async () => {
      await factory.user({ email: 'Legado@X.com', senha: md5('Senha!1') });
      expect(await repo.findAuthByEmail('legado@x.com')).toMatchObject({ email: 'Legado@X.com', senha: md5('Senha!1') });
    });

    it('devolve null para email inexistente', async () => {
      expect(await repo.findAuthByEmail('nada@x.com')).toBeNull();
    });
  });

  it('search acha pelo nome de usuário ou de exibição, sem diferenciar maiúsculas, e ignora quem ainda não tem nome', async () => {
    const olivia = await factory.user({ nome: 'sweetener', nomeExibicao: 'Olivia Fã 💜' });
    const mateus = await factory.user({ nome: 'mateus', nomeExibicao: null });
    await factory.user({ nome: null });
    await factory.user({ nome: 'outra.pessoa' });

    expect((await repo.search('SWEET')).map((u) => u.id)).toEqual([olivia.id]);
    expect((await repo.search('olivia')).map((u) => u.id)).toEqual([olivia.id]);
    expect((await repo.search('mat')).map((u) => u.id)).toEqual([mateus.id]);
    expect(await repo.search('ninguém-assim')).toEqual([]);
    expect(Object.keys((await repo.search('e'))[0]).sort()).toEqual(['bannerUrl', 'bio', 'fotoPerfil', 'fundadorDesde', 'id', 'mostrarSeloFundador', 'nome', 'nomeExibicao']);
  });

  it('search põe primeiro quem começa com o que foi digitado e devolve no máximo 20', async () => {
    const meio = await factory.user({ nome: 'zz.bia' });
    for (let i = 0; i < 22; i++) await factory.user({ nome: `bia${i}` });

    const achados = await repo.search('bia');
    expect(achados).toHaveLength(20);
    expect(achados.every((u) => u.nome.startsWith('bia'))).toBe(true);
    expect(achados.map((u) => u.id)).not.toContain(meio.id);

    const poucos = await repo.search('bia1');
    expect(poucos.map((u) => u.nome).slice(0, 1)).toEqual(['bia1']);
  });

  it('findAuthByEmail traz se é veterano; activateFounder liga o selo uma vez', async () => {
    const ana = await factory.user({ email: 'v@x.com', veterano: true });
    expect(await repo.findAuthByEmail('v@x.com')).toMatchObject({ veterano: true, fundadorDesde: null });

    await repo.activateFounder(ana.id);
    const { fundadorDesde } = await repo.findById(ana.id);
    expect(Date.now() - fundadorDesde.getTime()).toBeLessThan(60_000);
  });

  it('findByNames acha as contas pelos nomes de usuário, sem diferenciar maiúsculas', async () => {
    const bia = await factory.user({ nome: 'Bia.Souza' });
    const caio = await factory.user({ nome: 'caio' });
    await factory.user({ nome: 'outra' });
    const achados = await repo.findByNames(['bia.souza', 'CAIO', 'ninguem']);
    expect(achados.map((u) => u.id).sort()).toEqual([bia.id, caio.id].sort());
    expect(await repo.findByNames([])).toEqual([]);
  });

  it('setPinnedPost fixa e desafixa o post do perfil', async () => {
    const ana = await factory.user();
    const post = await db.prisma.post.create({ data: { autorId: ana.id, texto: 'oi' } });

    await repo.setPinnedPost(ana.id, post.id);
    expect((await db.prisma.usuario.findUnique({ where: { id: ana.id } })).postFixadoId).toBe(post.id);
    await repo.setPinnedPost(ana.id, null);
    expect((await db.prisma.usuario.findUnique({ where: { id: ana.id } })).postFixadoId).toBeNull();
  });

  it('findAuthById e updatePassword trocam o hash da senha', async () => {
    const ana = await factory.user({ senha: md5('velha') });
    expect(await repo.findAuthById(ana.id)).toEqual({ id: ana.id, senha: md5('velha') });

    await repo.updatePassword(ana.id, '$2b$nova');

    expect(await repo.findAuthById(ana.id)).toEqual({ id: ana.id, senha: '$2b$nova' });
    expect(await repo.findAuthById(9999)).toBeNull();
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
    expect(await repo.findById(ana.id)).toEqual({
      id: ana.id, nome: 'Ana', nomeExibicao: null, fotoPerfil: ana.fotoPerfil, bannerUrl: null, bio: 'oi', fundadorDesde: null, mostrarSeloFundador: true,
    });
    expect(await repo.findById(9999)).toBeNull();
  });

  it('update altera nome, nome de exibição, foto, capa e bio', async () => {
    const ana = await factory.user();
    await repo.update(ana.id, {
      nome: 'Novo', nomeExibicao: 'Ana Souza', fotoPerfil: 'n.png', bannerUrl: 'b.png', bio: 'bio', mostrarSeloFundador: false,
    });
    expect(await repo.findById(ana.id)).toEqual({
      id: ana.id, nome: 'Novo', nomeExibicao: 'Ana Souza', fotoPerfil: 'n.png', bannerUrl: 'b.png', bio: 'bio', fundadorDesde: null, mostrarSeloFundador: false,
    });
  });
});
