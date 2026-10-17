import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCommentRepository } from '../../src/repositories/commentRepository.js';

describe('commentRepository', () => {
  let db;
  let repo;

  beforeEach(() => {
    db = { query: vi.fn() };
    repo = createCommentRepository(db);
  });

  it('create insere o comentário e devolve o id', async () => {
    db.query.mockResolvedValue({ insertId: 5 });
    expect(await repo.create({ postId: 10, usuarioId: 7, texto: 'massa' })).toBe(5);
    expect(db.query).toHaveBeenCalledWith(expect.stringMatching(/INSERT INTO comentarios/), {
      p_texto: 'massa',
      p_likes: 0,
      p_post_idpost: 10,
      p_usuario_idusuario: 7,
    });
  });

  it('listByPost devolve os comentários com o autor', async () => {
    db.query.mockResolvedValue([
      { idcomentarios: 5, texto: 'massa', usuario_idusuario: 7, nome: 'Ana', fotoPerfil: 'a.png', post_idpost: 10, likes: 0 },
    ]);
    expect(await repo.listByPost(10)).toEqual([
      { id: 5, texto: 'massa', autor: { id: 7, nome: 'Ana', fotoPerfil: 'a.png' } },
    ]);
    expect(db.query).toHaveBeenCalledWith(expect.stringMatching(/ORDER BY comentarios\.idcomentarios DESC/), { p_idpost: 10 });
  });
});
