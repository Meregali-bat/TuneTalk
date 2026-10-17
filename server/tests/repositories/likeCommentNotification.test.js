import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestDatabase, seed } from '../helpers/testDatabase.js';
import { createLikeRepository } from '../../src/repositories/likeRepository.js';
import { createCommentRepository } from '../../src/repositories/commentRepository.js';
import { createNotificationRepository } from '../../src/repositories/notificationRepository.js';

describe('likeRepository, commentRepository e notificationRepository (Postgres)', () => {
  let db;
  let likes;
  let comments;
  let notifications;
  let ana;
  let bia;
  let post;

  beforeAll(async () => {
    db = await createTestDatabase();
    likes = createLikeRepository(db.prisma);
    comments = createCommentRepository(db.prisma);
    notifications = createNotificationRepository(db.prisma);
  });
  beforeEach(async () => {
    await db.reset();
    const factory = seed(db.prisma);
    ana = await factory.user({ nome: 'Ana', fotoPerfil: 'ana.png' });
    bia = await factory.user({ nome: 'Bia', fotoPerfil: 'bia.png' });
    post = await factory.post(ana.id);
  });
  afterAll(() => db.close());

  describe('likes', () => {
    it('add, hasLiked, countByPost e remove', async () => {
      expect(await likes.hasLiked(post.id, bia.id)).toBe(false);

      await likes.add({ postId: post.id, usuarioId: bia.id });
      expect(await likes.hasLiked(post.id, bia.id)).toBe(true);
      expect(await likes.countByPost(post.id)).toBe(1);

      await likes.remove(post.id, bia.id);
      expect(await likes.hasLiked(post.id, bia.id)).toBe(false);
      expect(await likes.countByPost(post.id)).toBe(0);
    });

    it('likedPostIds devolve os posts curtidos pelo usuário', async () => {
      const outro = await seed(db.prisma).post(bia.id);
      await likes.add({ postId: post.id, usuarioId: bia.id });
      await likes.add({ postId: outro.id, usuarioId: bia.id });
      expect((await likes.likedPostIds(bia.id)).sort()).toEqual([post.id, outro.id].sort());
      expect(await likes.likedPostIds(ana.id)).toEqual([]);
    });
  });

  describe('comments', () => {
    it('create e listByPost (mais novos primeiro, com autor)', async () => {
      const first = await comments.create({ postId: post.id, usuarioId: bia.id, texto: 'primeiro' });
      const second = await comments.create({ postId: post.id, usuarioId: ana.id, texto: 'segundo' });

      expect(await comments.listByPost(post.id)).toEqual([
        { id: second, texto: 'segundo', autor: { id: ana.id, nome: 'Ana', fotoPerfil: 'ana.png' } },
        { id: first, texto: 'primeiro', autor: { id: bia.id, nome: 'Bia', fotoPerfil: 'bia.png' } },
      ]);
    });
  });

  describe('notifications', () => {
    it('create, listForUser (mais novas primeiro), countUnread e markAllRead', async () => {
      await notifications.create({ destinatarioId: ana.id, autorId: bia.id, tipo: 'new_follower', conteudo: 'seguiu você' });
      await notifications.create({ destinatarioId: ana.id, autorId: bia.id, tipo: 'like', conteudo: 'curtiu seu post', postId: post.id });
      await notifications.create({ destinatarioId: bia.id, autorId: ana.id, tipo: 'comment', conteudo: 'comentou', postId: post.id });

      const list = await notifications.listForUser(ana.id);
      expect(list).toEqual([
        { id: expect.any(Number), tipo: 'like', conteudo: 'curtiu seu post', lida: false, postId: post.id, data: expect.any(String), autor: { id: bia.id, nome: 'Bia', fotoPerfil: 'bia.png' } },
        { id: expect.any(Number), tipo: 'new_follower', conteudo: 'seguiu você', lida: false, postId: null, data: expect.any(String), autor: { id: bia.id, nome: 'Bia', fotoPerfil: 'bia.png' } },
      ]);
      expect(Date.now() - Date.parse(list[0].data)).toBeLessThan(60_000);
      expect(await notifications.countUnread(ana.id)).toBe(2);

      await notifications.markAllRead(ana.id);
      expect(await notifications.countUnread(ana.id)).toBe(0);
      expect(await notifications.countUnread(bia.id)).toBe(1);
    });

    it('removeLike apaga só a notificação de curtida daquele usuário no post', async () => {
      await notifications.create({ destinatarioId: ana.id, autorId: bia.id, tipo: 'like', conteudo: 'curtiu seu post', postId: post.id });
      await notifications.create({ destinatarioId: ana.id, autorId: bia.id, tipo: 'comment', conteudo: 'comentou', postId: post.id });

      await notifications.removeLike(post.id, bia.id);

      expect((await notifications.listForUser(ana.id)).map((n) => n.tipo)).toEqual(['comment']);
    });
  });
});
