import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFollowRepository } from '../../src/repositories/followRepository.js';

describe('followRepository', () => {
  let db;
  let repo;

  beforeEach(() => {
    db = { query: vi.fn() };
    repo = createFollowRepository(db);
  });

  it('isFollowing consulta a relação seguidor → seguido', async () => {
    db.query.mockResolvedValue([{ usuario_idusuario: 1 }]);
    expect(await repo.isFollowing(1, 2)).toBe(true);
    expect(db.query).toHaveBeenCalledWith(expect.stringMatching(/FROM seguir/), { p_id_usuario: 1, p_id_usuario1: 2 });

    db.query.mockResolvedValue([]);
    expect(await repo.isFollowing(1, 2)).toBe(false);
  });

  it('follow insere a relação', async () => {
    db.query.mockResolvedValue({});
    await repo.follow(1, 2);
    expect(db.query).toHaveBeenCalledWith(expect.stringMatching(/INSERT INTO seguir/), { p_id_usuario: 1, p_id_usuario1: 2 });
  });

  it('unfollow remove a relação', async () => {
    db.query.mockResolvedValue({});
    await repo.unfollow(1, 2);
    expect(db.query).toHaveBeenCalledWith(expect.stringMatching(/DELETE FROM seguir/), { p_id_usuario: 1, p_id_usuario1: 2 });
  });

  it('followingIds devolve os ids que o usuário segue', async () => {
    db.query.mockResolvedValue([{ usuario_idusuario1: 3 }, { usuario_idusuario1: 4 }]);
    expect(await repo.followingIds(1)).toEqual([3, 4]);
  });

  it('listFollowing devolve os usuários seguidos', async () => {
    db.query.mockResolvedValue([{ idusuario: 3, nome: 'B', fotoPerfil: 'b.png', bio: 'bio' }]);
    expect(await repo.listFollowing(1)).toEqual([{ id: 3, nome: 'B', fotoPerfil: 'b.png', bio: 'bio' }]);
    expect(db.query).toHaveBeenCalledWith(expect.stringMatching(/seguir\.usuario_idusuario1 = usuario\.idusuario/), { p_id_usuario: 1 });
  });

  it('listFollowers devolve os seguidores', async () => {
    db.query.mockResolvedValue([{ idusuario: 5, nome: 'C', fotoPerfil: 'c.png', bio: null }]);
    expect(await repo.listFollowers(1)).toEqual([{ id: 5, nome: 'C', fotoPerfil: 'c.png', bio: null }]);
    expect(db.query).toHaveBeenCalledWith(expect.stringMatching(/seguir\.usuario_idusuario = usuario\.idusuario/), { p_id_usuario1: 1 });
  });

  it('countFollowing e countFollowers devolvem números', async () => {
    db.query.mockResolvedValueOnce([{ quantidade: 2 }]).mockResolvedValueOnce([{ quantidade: 5 }]);
    expect(await repo.countFollowing(1)).toBe(2);
    expect(await repo.countFollowers(1)).toBe(5);
  });
});
