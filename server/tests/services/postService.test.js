import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPostService } from '../../src/services/postService.js';

const post = (id, autorId = 2, extra = {}) => ({ id, likes: 0, autor: { id: autorId, nome: 'X', fotoPerfil: 'x' }, ...extra });

describe('postService', () => {
  let posts;
  let likes;
  let notifications;
  let service;
  const now = new Date('2024-05-05T12:00:00Z');

  beforeEach(() => {
    posts = {
      listLatest: vi.fn().mockResolvedValue([post(1), post(2)]),
      listFromFollowed: vi.fn().mockResolvedValue([post(3)]),
      listByAuthor: vi.fn().mockResolvedValue([post(4)]),
      findById: vi.fn().mockResolvedValue(post(1, 2, { likes: 5 })),
      listReplies: vi.fn().mockResolvedValue([post(8, 3, { parentId: 1 }), post(9, 7, { parentId: 1 })]),
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
    notifications = { create: vi.fn(), removeLike: vi.fn() };
    service = createPostService({
      posts,
      likes,
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
    it('devolve o post e as respostas, marcando o que quem vê curtiu', async () => {
      likes.hasLiked.mockResolvedValue(true);
      likes.likedPostIds.mockResolvedValue([9]);
      const result = await service.get(1, 7);

      expect(posts.listReplies).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        post: { ...post(1, 2, { likes: 5 }), curtido: true },
        pai: null,
        respostas: [
          { ...post(8, 3, { parentId: 1 }), curtido: false },
          { ...post(9, 7, { parentId: 1 }), curtido: true },
        ],
      });
    });

    it('quando é uma resposta, devolve também o post pai', async () => {
      posts.findById.mockImplementation(async (id) => (id === 8 ? post(8, 3, { parentId: 1 }) : post(1)));
      posts.listReplies.mockResolvedValue([]);

      const result = await service.get(8, 7);

      expect(result.post.id).toBe(8);
      expect(result.pai).toEqual({ ...post(1), curtido: false });
    });

    it('lança 404 quando o post não existe', async () => {
      posts.findById.mockResolvedValue(null);
      await expect(service.get(1, 7)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('create', () => {
    it('grava o post com autor, data atual e nota como número', async () => {
      const id = await service.create(7, { texto: 'oi', musicName: 'Help!', nota: '7', postType: 'música' });
      expect(id).toBe(42);
      expect(posts.create).toHaveBeenCalledWith({
        texto: 'oi',
        musicName: 'Help!',
        nota: 7,
        postType: 'música',
        autorId: 7,
        data: now,
      });
    });

    it('ignora campos desconhecidos do corpo', async () => {
      await service.create(7, { musicName: 'x', nota: 5, usuario_idusuario: 1, likes: 999 });
      expect(posts.create.mock.calls[0][0]).not.toHaveProperty('likes');
      expect(posts.create.mock.calls[0][0]).not.toHaveProperty('usuario_idusuario');
    });

    it('aceita nota inteira de 0 a 10 (cada ponto é meia estrela)', async () => {
      for (const nota of [0, 1, 9, 10, '10']) {
        await service.create(7, { musicName: 'x', nota });
      }
      expect(posts.create.mock.calls.map(([post]) => post.nota)).toEqual([0, 1, 9, 10, 10]);
    });

    it('com música, exige a nota', async () => {
      await expect(service.create(7, { musicName: 'x' })).rejects.toMatchObject({
        status: 400,
        message: 'Dê uma nota de 0 a 10.',
      });
    });

    it('rejeita nota fora de 0 a 10 ou quebrada', async () => {
      for (const nota of [-1, 11, 4.5, 'abc', '']) {
        await expect(service.create(7, { musicName: 'x', nota })).rejects.toMatchObject({
          status: 400,
          message: 'A nota deve ser um número inteiro de 0 a 10.',
        });
      }
      expect(posts.create).not.toHaveBeenCalled();
    });

    it('rejeita texto com mais de 500 caracteres', async () => {
      await expect(service.create(7, { musicName: 'x', nota: 6, texto: 'a'.repeat(501) })).rejects.toMatchObject({
        status: 400,
        message: 'O texto pode ter no máximo 500 caracteres.',
      });
    });

    it('a música é opcional: sem ela o post é só texto e fica sem nota', async () => {
      await service.create(7, { texto: '  bom dia  ', nota: 8 });
      expect(posts.create).toHaveBeenCalledWith({ texto: 'bom dia', nota: null, autorId: 7, data: now });
    });

    it('sem música, exige texto', async () => {
      await expect(service.create(7, { texto: '   ' })).rejects.toMatchObject({
        status: 400,
        message: 'Escreva algo ou escolha uma música.',
      });
      expect(posts.create).not.toHaveBeenCalled();
    });

    describe('respostas (comentários)', () => {
      it('grava a resposta ligada ao post pai e notifica o autor dele', async () => {
        await service.create(7, { texto: 'concordo', parentId: '1' });

        expect(posts.findById).toHaveBeenCalledWith(1);
        expect(posts.create).toHaveBeenCalledWith({ texto: 'concordo', nota: null, parentId: 1, autorId: 7, data: now });
        expect(notifications.create).toHaveBeenCalledWith({
          destinatarioId: 2,
          autorId: 7,
          tipo: 'comment',
          conteudo: 'comentou no seu post',
          postId: 1,
        });
      });

      it('a resposta também pode ter música e nota', async () => {
        await service.create(7, { parentId: 1, musicName: 'Help!', nota: 6 });
        expect(posts.create.mock.calls[0][0]).toMatchObject({ parentId: 1, musicName: 'Help!', nota: 6 });
      });

      it('não notifica quem responde o próprio post', async () => {
        await service.create(2, { texto: 'eu de novo', parentId: 1 });
        expect(notifications.create).not.toHaveBeenCalled();
      });

      it('lança 404 quando o post pai não existe', async () => {
        posts.findById.mockResolvedValue(null);
        await expect(service.create(7, { texto: 'oi', parentId: 1 })).rejects.toMatchObject({ status: 404 });
        expect(posts.create).not.toHaveBeenCalled();
      });

      it('rejeita parentId inválido', async () => {
        await expect(service.create(7, { texto: 'oi', parentId: 'abc' })).rejects.toMatchObject({ status: 400 });
      });
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
});
