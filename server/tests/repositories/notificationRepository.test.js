import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNotificationRepository } from '../../src/repositories/notificationRepository.js';

describe('notificationRepository', () => {
  let db;
  let repo;

  beforeEach(() => {
    db = { query: vi.fn() };
    repo = createNotificationRepository(db);
  });

  it('listForUser devolve as notificações com quem as gerou', async () => {
    db.query.mockResolvedValue([
      {
        idnotificacoes: 1,
        usuario_idusuario: 7,
        usuario_idusuario1: 3,
        tipo: 'like',
        conteudo: 'curtiu seu post',
        lida: 0,
        post_id: 10,
        nome: 'Bia',
        fotoPerfil: 'b.png',
      },
    ]);

    expect(await repo.listForUser(7)).toEqual([
      {
        id: 1,
        tipo: 'like',
        conteudo: 'curtiu seu post',
        lida: false,
        postId: 10,
        autor: { id: 3, nome: 'Bia', fotoPerfil: 'b.png' },
      },
    ]);
    expect(db.query).toHaveBeenCalledWith(expect.stringMatching(/ORDER BY notificacoes\.idnotificacoes DESC/), { p_id_usuario: 7 });
  });

  it('countUnread devolve o total não lido', async () => {
    db.query.mockResolvedValue([{ count: 3 }]);
    expect(await repo.countUnread(7)).toBe(3);
  });

  it('markAllRead marca todas como lidas', async () => {
    db.query.mockResolvedValue({});
    await repo.markAllRead(7);
    expect(db.query).toHaveBeenCalledWith(expect.stringMatching(/UPDATE notificacoes SET lida = true/), { p_id_usuario: 7 });
  });

  it('create grava a notificação', async () => {
    db.query.mockResolvedValue({});
    await repo.create({ destinatarioId: 3, autorId: 7, tipo: 'comment', conteudo: 'comentou no seu post', postId: 10 });
    expect(db.query).toHaveBeenCalledWith(expect.stringMatching(/INSERT INTO notificacoes/), {
      p_destinatario: 3,
      p_autor: 7,
      p_tipo: 'comment',
      p_conteudo: 'comentou no seu post',
      p_post_id: 10,
    });
  });

  it('create aceita notificação sem post (novo seguidor)', async () => {
    db.query.mockResolvedValue({});
    await repo.create({ destinatarioId: 3, autorId: 7, tipo: 'new_follower', conteudo: 'seguiu você' });
    expect(db.query.mock.calls[0][1].p_post_id).toBeNull();
  });

  it('removeLike apaga só a notificação de curtida daquele usuário no post', async () => {
    db.query.mockResolvedValue({});
    await repo.removeLike(10, 7);
    expect(db.query).toHaveBeenCalledWith(expect.stringMatching(/tipo = 'like'/), { p_idpost: 10, p_idusuario: 7 });
  });
});
