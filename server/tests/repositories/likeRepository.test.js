import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLikeRepository } from '../../src/repositories/likeRepository.js';

describe('likeRepository', () => {
  let db;
  let repo;

  beforeEach(() => {
    db = { query: vi.fn() };
    repo = createLikeRepository(db);
  });

  it('hasLiked verifica se o usuário curtiu o post', async () => {
    db.query.mockResolvedValue([{ 1: 1 }]);
    expect(await repo.hasLiked(10, 7)).toBe(true);
    expect(db.query).toHaveBeenCalledWith(expect.stringMatching(/FROM curtir/), { p_idpost: 10, p_idusuario: 7 });

    db.query.mockResolvedValue([]);
    expect(await repo.hasLiked(10, 7)).toBe(false);
  });

  it('add registra a curtida com o autor do post', async () => {
    db.query.mockResolvedValue({});
    await repo.add({ postId: 10, autorId: 3, usuarioId: 7 });
    expect(db.query).toHaveBeenCalledWith(expect.stringMatching(/INSERT INTO curtir/), {
      p_idpost: 10,
      p_autorId: 3,
      p_idusuario: 7,
    });
  });

  it('remove apaga a curtida', async () => {
    db.query.mockResolvedValue({});
    await repo.remove(10, 7);
    expect(db.query).toHaveBeenCalledWith(expect.stringMatching(/DELETE FROM curtir/), { p_idpost: 10, p_idusuario: 7 });
  });

  it('likedPostIds devolve os ids curtidos pelo usuário', async () => {
    db.query.mockResolvedValue([{ post_idpost: 1 }, { post_idpost: 2 }]);
    expect(await repo.likedPostIds(7)).toEqual([1, 2]);
  });
});
