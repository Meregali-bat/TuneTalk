import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPostService } from '../../src/services/postService.js';

const post = (id, autorId = 2, extra = {}) => ({ id, likes: 0, autor: { id: autorId, nome: 'X', fotoPerfil: 'x' }, ...extra });

describe('postService', () => {
  let posts;
  let likes;
  let comments;
  let notifications;
  let service;
  const now = new Date('2024-05-05T12:00:00Z');

  beforeEach(() => {
    posts = {
      listLatest: vi.fn().mockResolvedValue([post(1), post(2)]),
      listFromFollowed: vi.fn().mockResolvedValue([post(3)]),
      listByAuthor: vi.fn().mockResolvedValue([post(4)]),
      findById: vi.fn().mockResolvedValue(post(1, 2, { likes: 5 })),
      create: vi.fn().mockResolvedValue(42),
      remove: vi.fn(),
    };
    likes = {
      likedPostIds: vi.fn().mockResolvedValue([2, 3]),
      hasLiked: vi.fn().mockResolvedValue(false),
      add: vi.fn(),
      remove: vi.fn(),
      countByPost: vi.fn().mockResolvedValue(6),
    };
    comments = {
      listByPost: vi.fn().mockResolvedValue([{ id: 9 }]),
      create: vi.fn().mockResolvedValue(9),
    };
    notifications = { create: vi.fn(), removeLike: vi.fn() };
    service = createPostService({
      posts,
      likes,
      comments,
      notifications,
      shuffle: (list) => [...list].reverse(),
      now: () => now,
    });
  });

  describe('feeds', () => {
    it('forYou embaralha os mais recentes e marca os curtidos pelo usuário', async () => {
      const feed = await service.forYou(7);
      expect(likes.likedPostIds).toHaveBeenCalledWith(7);
      expect(feed.map((p) => [p.id, p.curtido])).toEqual([[2, true], [1, false]]);
    });

    it('following lista os posts de quem o usuário segue', async () => {
      const feed = await service.following(7);
      expect(posts.listFromFollowed).toHaveBeenCalledWith(7);
      expect(feed).toEqual([{ ...post(3), curtido: true }]);
    });

    it('byAuthor lista os posts de um autor marcados para quem vê', async () => {
      const feed = await service.byAuthor(4, 7);
      expect(posts.listByAuthor).toHaveBeenCalledWith(4);
      expect(feed).toEqual([{ ...post(4), curtido: false }]);
    });
  });

  describe('get', () => {
    it('devolve o post com comentários e se foi curtido', async () => {
      likes.hasLiked.mockResolvedValue(true);
      const result = await service.get(1, 7);
      expect(result).toEqual({ post: { ...post(1, 2, { likes: 5 }), curtido: true }, comentarios: [{ id: 9 }] });
    });

    it('lança 404 quando o post não existe', async () => {
      posts.findById.mockResolvedValue(null);
      await expect(service.get(1, 7)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('create', () => {
    it('grava o post com autor e data atual', async () => {
      const id = await service.create(7, { texto: 'oi', musicName: 'Help!', nota: '4', postType: 'música' });
      expect(id).toBe(42);
      expect(posts.create).toHaveBeenCalledWith({
        texto: 'oi',
        musicName: 'Help!',
        nota: '4',
        postType: 'música',
        autorId: 7,
        data: now,
      });
    });

    it('ignora campos desconhecidos do corpo', async () => {
      await service.create(7, { musicName: 'x', usuario_idusuario: 1, likes: 999 });
      expect(posts.create.mock.calls[0][0]).not.toHaveProperty('likes');
      expect(posts.create.mock.calls[0][0]).not.toHaveProperty('usuario_idusuario');
    });

    it('exige uma música ou um álbum', async () => {
      await expect(service.create(7, { texto: 'sem música' })).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('remove', () => {
    it('apaga quando o usuário é o autor', async () => {
      await service.remove(1, 2);
      expect(posts.remove).toHaveBeenCalledWith(1);
    });

    it('proíbe apagar post de outra pessoa', async () => {
      await expect(service.remove(1, 7)).rejects.toMatchObject({ status: 403 });
      expect(posts.remove).not.toHaveBeenCalled();
    });

    it('lança 404 quando o post não existe', async () => {
      posts.findById.mockResolvedValue(null);
      await expect(service.remove(1, 2)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('like', () => {
    it('registra a curtida, devolve o total contado e notifica o autor', async () => {
      expect(await service.like(1, 7)).toBe(6);
      expect(likes.add).toHaveBeenCalledWith({ postId: 1, usuarioId: 7 });
      expect(likes.countByPost).toHaveBeenCalledWith(1);
      expect(notifications.create).toHaveBeenCalledWith({
        destinatarioId: 2,
        autorId: 7,
        tipo: 'like',
        conteudo: 'curtiu seu post',
        postId: 1,
      });
    });

    it('não notifica quando o autor curte o próprio post', async () => {
      await service.like(1, 2);
      expect(notifications.create).not.toHaveBeenCalled();
    });

    it('é idempotente: se já curtiu, só devolve a contagem atual', async () => {
      likes.hasLiked.mockResolvedValue(true);
      expect(await service.like(1, 7)).toBe(5);
      expect(likes.add).not.toHaveBeenCalled();
    });

    it('lança 404 para post inexistente', async () => {
      posts.findById.mockResolvedValue(null);
      await expect(service.like(1, 7)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('unlike', () => {
    it('remove a curtida, devolve o total contado e apaga a notificação', async () => {
      likes.hasLiked.mockResolvedValue(true);
      likes.countByPost.mockResolvedValue(4);
      expect(await service.unlike(1, 7)).toBe(4);
      expect(likes.remove).toHaveBeenCalledWith(1, 7);
      expect(notifications.removeLike).toHaveBeenCalledWith(1, 7);
    });

    it('é idempotente: se não curtiu, só devolve a contagem atual', async () => {
      expect(await service.unlike(1, 7)).toBe(5);
      expect(likes.remove).not.toHaveBeenCalled();
    });
  });

  describe('comment', () => {
    it('cria o comentário e notifica o autor', async () => {
      expect(await service.comment(1, 7, '  massa  ')).toBe(9);
      expect(comments.create).toHaveBeenCalledWith({ postId: 1, usuarioId: 7, texto: 'massa' });
      expect(notifications.create).toHaveBeenCalledWith({
        destinatarioId: 2,
        autorId: 7,
        tipo: 'comment',
        conteudo: 'comentou no seu post',
        postId: 1,
      });
    });

    it('rejeita texto vazio', async () => {
      await expect(service.comment(1, 7, '   ')).rejects.toMatchObject({ status: 400 });
      expect(comments.create).not.toHaveBeenCalled();
    });

    it('lança 404 para post inexistente', async () => {
      posts.findById.mockResolvedValue(null);
      await expect(service.comment(1, 7, 'oi')).rejects.toMatchObject({ status: 404 });
    });
  });
});
