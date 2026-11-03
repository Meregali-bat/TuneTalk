import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHashtagService } from '../../src/services/hashtagService.js';

const agora = new Date('2026-11-10T12:00:00Z');

describe('hashtagService', () => {
  let posts;
  let service;

  beforeEach(() => {
    posts = { listHashtagTexts: vi.fn() };
    service = createHashtagService({ posts, now: () => agora });
  });

  describe('trending (em alta)', () => {
    it('conta em quantos posts dos últimos 7 dias cada hashtag aparece, das mais usadas para as menos', async () => {
      posts.listHashtagTexts.mockResolvedValue([
        'ouvindo #GUTS #GUTS de novo', // conta 1 post só, mesmo repetida
        'que disco #guts',
        'chuva #mpb',
        '#GUTS e #mpb',
        'só #rock',
      ]);

      expect(await service.trending()).toEqual([
        { tag: 'GUTS', posts: 3 },
        { tag: 'mpb', posts: 2 },
        { tag: 'rock', posts: 1 },
      ]);
      expect(posts.listHashtagTexts).toHaveBeenCalledWith({ desde: new Date('2026-11-03T12:00:00Z'), limite: 1000 });
    });

    it('sem nada nos últimos 7 dias, mostra as mais usadas de todos os tempos', async () => {
      posts.listHashtagTexts.mockResolvedValueOnce([]).mockResolvedValueOnce(['#beatles', '#beatles #vinil']);
      expect(await service.trending()).toEqual([{ tag: 'beatles', posts: 2 }, { tag: 'vinil', posts: 1 }]);
      expect(posts.listHashtagTexts).toHaveBeenLastCalledWith({ limite: 1000 });
    });

    it('mostra no máximo 10', async () => {
      posts.listHashtagTexts.mockResolvedValue(Array.from({ length: 15 }, (_, i) => `#tag${String(i).padStart(2, '0')}`));
      expect(await service.trending()).toHaveLength(10);
    });
  });

  describe('search', () => {
    it('acha hashtags que começam com o texto (com ou sem #), com quantos posts', async () => {
      posts.listHashtagTexts.mockResolvedValue(['#gutsworldtour', 'amo #GUTS', '#guts', 'ver #agutsy']);
      // Empate de grafia (#GUTS e #guts, uma vez cada): vale a do post mais recente.
      expect(await service.search('#Gu')).toEqual([
        { tag: 'GUTS', posts: 2 },
        { tag: 'gutsworldtour', posts: 1 },
      ]);
      expect(posts.listHashtagTexts).toHaveBeenCalledWith({ contem: 'gu', limite: 1000 });
    });

    it('busca vazia não consulta o banco', async () => {
      expect(await service.search(' # ')).toEqual([]);
      expect(posts.listHashtagTexts).not.toHaveBeenCalled();
    });
  });
});
