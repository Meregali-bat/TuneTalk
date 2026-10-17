import { describe, it, expect, vi, beforeEach } from 'vitest';
import md5 from 'md5';
import { createUserRepository } from '../../src/repositories/userRepository.js';

const row = {
  idusuario: 7,
  nome: 'Ana',
  email: 'ana@x.com',
  senha: 'hash',
  fotoPerfil: 'foto.png',
  bio: 'oi',
};

describe('userRepository', () => {
  let db;
  let repo;

  beforeEach(() => {
    db = { query: vi.fn() };
    repo = createUserRepository(db);
  });

  describe('findByCredentials', () => {
    it('busca pelo email e pelo hash md5 da senha e devolve o usuário sem a senha', async () => {
      db.query.mockResolvedValue([row]);

      const user = await repo.findByCredentials('ana@x.com', 'Segredo!1');

      expect(db.query).toHaveBeenCalledWith(expect.stringMatching(/FROM usuario/), {
        p_email: 'ana@x.com',
        p_senha: md5('Segredo!1'),
      });
      expect(user).toEqual({ id: 7, nome: 'Ana', email: 'ana@x.com', fotoPerfil: 'foto.png', bio: 'oi' });
    });

    it('devolve null quando não encontra', async () => {
      db.query.mockResolvedValue([]);
      expect(await repo.findByCredentials('a', 'b')).toBeNull();
    });
  });

  describe('existsByNameOrEmail', () => {
    it('é true quando já existe usuário com o nome ou email', async () => {
      db.query.mockResolvedValue([row]);
      expect(await repo.existsByNameOrEmail('Ana', 'x@x.com')).toBe(true);
      expect(db.query).toHaveBeenCalledWith(expect.any(String), { p_nome: 'Ana', p_email: 'x@x.com' });
    });

    it('é false quando não existe', async () => {
      db.query.mockResolvedValue([]);
      expect(await repo.existsByNameOrEmail('Ana', 'x@x.com')).toBe(false);
    });
  });

  it('create insere com a senha em md5 e devolve o id criado', async () => {
    db.query.mockResolvedValue({ insertId: 99 });

    const id = await repo.create({ nome: 'Ana', email: 'a@a.com', senha: 'Abc!12', fotoPerfil: 'f.png' });

    expect(id).toBe(99);
    expect(db.query).toHaveBeenCalledWith(expect.stringMatching(/INSERT INTO usuario/), {
      p_nome: 'Ana',
      p_email: 'a@a.com',
      p_senha: md5('Abc!12'),
      p_fotoPerfil: 'f.png',
    });
  });

  describe('findById', () => {
    it('devolve o usuário público', async () => {
      db.query.mockResolvedValue([{ idusuario: 7, nome: 'Ana', fotoPerfil: 'f', bio: null }]);
      expect(await repo.findById(7)).toEqual({ id: 7, nome: 'Ana', fotoPerfil: 'f', bio: null });
      expect(db.query).toHaveBeenCalledWith(expect.any(String), { p_id_usuario: 7 });
    });

    it('devolve null quando não existe', async () => {
      db.query.mockResolvedValue([]);
      expect(await repo.findById(1)).toBeNull();
    });
  });

  it('update altera nome, foto e bio', async () => {
    db.query.mockResolvedValue({});
    await repo.update(7, { nome: 'N', fotoPerfil: 'F', bio: 'B' });
    expect(db.query).toHaveBeenCalledWith(expect.stringMatching(/UPDATE usuario/), {
      p_nome: 'N',
      p_fotoPerfil: 'F',
      p_bio: 'B',
      p_id_usuario: 7,
    });
  });
});
