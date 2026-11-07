import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPostService } from '../../src/services/postService.js';

const post = (id, autorId = 2, extra = {}) => ({ id, likes: 0, autor: { id: autorId, nome: 'X', fotoPerfil: 'x' }, ...extra });

describe('postService', () => {
  let posts;
  let likes;
  let notifications;
  let users;
  let service;
  const now = new Date('2024-05-05T12:00:00Z');

  beforeEach(() => {
    posts = {
      listLatest: vi.fn().mockResolvedValue([post(1), post(2)]),
      listFromFollowed: vi.fn().mockResolvedValue([post(3)]),
      listByAuthor: vi.fn().mockResolvedValue([post(4)]),
      findById: vi.fn().mockResolvedValue(post(1, 2, { likes: 5 })),
      listReplies: vi.fn().mockResolvedValue([post(8, 3, { parentId: 1 }), post(9, 7, { parentId: 1 })]),
      listFirstReplies: vi.fn().mockResolvedValue(new Map()),
      create: vi.fn().mockResolvedValue(42),
      remove: vi.fn(),
      votar: vi.fn().mockResolvedValue(true),
      votosDe: vi.fn().mockResolvedValue(new Map()),
      countByAuthor: vi.fn().mockResolvedValue(5),
      contarReplays: vi.fn().mockResolvedValue(new Map()),
      listReplays: vi.fn().mockResolvedValue([]),
    };
    likes = {
      likedPostIds: vi.fn().mockResolvedValue([2, 3]),
      hasLiked: vi.fn().mockResolvedValue(false),
      add: vi.fn(),
      remove: vi.fn(),
      countByPost: vi.fn().mockResolvedValue(6),
    };
    notifications = { create: vi.fn(), removeLike: vi.fn(), exists: vi.fn().mockResolvedValue(false) };
    users = { setPinnedPost: vi.fn(), findByNames: vi.fn().mockResolvedValue([]), unlockEffect: vi.fn().mockResolvedValue(true) };
    service = createPostService({
      posts,
      likes,
      notifications,
      users,
      now: () => now,
    });
  });

  describe('feeds', () => {
    it('forYou mostra os mais recentes primeiro, sem embaralhar, e marca os curtidos pelo usuário', async () => {
      posts.listLatest.mockResolvedValue([post(3), post(2), post(1)]);
      const feed = await service.forYou(7);
      expect(likes.likedPostIds).toHaveBeenCalledWith(7);
      expect(feed.map((p) => [p.id, p.curtido])).toEqual([[3, true], [2, true], [1, false]]);
    });

    it('following lista os posts de quem o usuário segue', async () => {
      const feed = await service.following(7);
      expect(posts.listFromFollowed).toHaveBeenCalledWith(7, { ocultos: [] });
      expect(feed).toEqual([{ ...post(3), curtido: true, quantidadeReplays: 0 }]);
    });

    it('sem página, pede a primeira; com página, continua do último post mostrado', async () => {
      await service.forYou(7);
      expect(posts.listLatest).toHaveBeenLastCalledWith({ ocultos: [] });
      await service.forYou(7, { antes: '2024-01-02T00:00:00.000Z', antesId: '40' });
      expect(posts.listLatest).toHaveBeenLastCalledWith({ antes: { data: new Date('2024-01-02T00:00:00.000Z'), id: 40 }, ocultos: [] });
      await service.following(7, { antes: '2024-01-02T00:00:00.000Z', antesId: '40' });
      expect(posts.listFromFollowed).toHaveBeenLastCalledWith(7, { antes: { data: new Date('2024-01-02T00:00:00.000Z'), id: 40 }, ocultos: [] });
    });

    it('página inválida responde 400', async () => {
      for (const pagina of [{ antes: 'ontem', antesId: '1' }, { antes: '2024-01-01', antesId: 'x' }, { antesId: '3' }, { antes: '2024-01-01', antesId: '-1' }]) {
        await expect(service.forYou(7, pagina)).rejects.toMatchObject({ status: 400 });
      }
    });

    it('byHashtag lista os posts da hashtag (sem o #) marcados para quem vê', async () => {
      posts.listByHashtag = vi.fn().mockResolvedValue([post(3)]);
      expect(await service.byHashtag('#Rock', 7)).toEqual([{ ...post(3), curtido: true, quantidadeReplays: 0 }]);
      expect(posts.listByHashtag).toHaveBeenCalledWith('rock', { ocultos: [] });
      await expect(service.byHashtag('#', 7)).rejects.toMatchObject({ status: 400 });
    });

    it('repliesByAuthor lista os comentários da pessoa marcados para quem vê', async () => {
      posts.listRepliesByAuthor = vi.fn().mockResolvedValue([post(3, 4, { parentId: 1 })]);
      expect(await service.repliesByAuthor(4, 7)).toEqual([{ ...post(3, 4, { parentId: 1 }), curtido: true }]);
      expect(posts.listRepliesByAuthor).toHaveBeenCalledWith(4);
    });

    it('byAuthor põe o post fixado primeiro, mantendo a ordem dos outros', async () => {
      posts.listByAuthor.mockResolvedValue([post(9), post(8), post(7, 2, { fixado: true }), post(6)]);
      expect((await service.byAuthor(2, 7)).map((p) => p.id)).toEqual([7, 9, 8, 6]);
    });

    it('byAuthor lista os posts de um autor marcados para quem vê', async () => {
      const feed = await service.byAuthor(4, 7);
      expect(posts.listByAuthor).toHaveBeenCalledWith(4);
      expect(feed).toEqual([{ ...post(4), curtido: false, quantidadeReplays: 0 }]);
    });
  });

  describe('get', () => {
    it('devolve o post e as respostas, marcando o que quem vê curtiu', async () => {
      likes.hasLiked.mockResolvedValue(true);
      likes.likedPostIds.mockResolvedValue([9]);
      const result = await service.get(1, 7);

      expect(posts.listReplies).toHaveBeenCalledWith(1, { ocultos: [] });
      expect(result).toEqual({
        post: { ...post(1, 2, { likes: 5 }), curtido: true, quantidadeReplays: 0 },
        pai: null,
        respostas: [
          { ...post(8, 3, { parentId: 1 }), curtido: false, primeiraResposta: null },
          { ...post(9, 7, { parentId: 1 }), curtido: true, primeiraResposta: null },
        ],
      });
    });

    it('cada comentário traz a primeira resposta dele, como no Twitter', async () => {
      likes.likedPostIds.mockResolvedValue([20]);
      posts.listFirstReplies.mockResolvedValue(new Map([[8, post(20, 2, { parentId: 8 })]]));

      const { respostas } = await service.get(1, 7);

      expect(posts.listFirstReplies).toHaveBeenCalledWith([8, 9], { ocultos: [] });
      expect(respostas[0].primeiraResposta).toEqual({ ...post(20, 2, { parentId: 8 }), curtido: true });
      expect(respostas[1].primeiraResposta).toBeNull();
    });

    it('quando é uma resposta, devolve também o post pai', async () => {
      posts.findById.mockImplementation(async (id) => (id === 8 ? post(8, 3, { parentId: 1 }) : post(1)));
      posts.listReplies.mockResolvedValue([]);

      const result = await service.get(8, 7);

      expect(result.post.id).toBe(8);
      expect(result.pai).toEqual({ ...post(1), curtido: false, quantidadeReplays: 0 });
    });

    it('lança 404 quando o post não existe', async () => {
      posts.findById.mockResolvedValue(null);
      await expect(service.get(1, 7)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('enquete de músicas', () => {
    const capa = 'https://cdn-images.dzcdn.net/c.jpg';
    const opcoes = [{ titulo: 'Help!', artista: 'The Beatles', capa }, { titulo: 'Yesterday', artista: 'The Beatles', capa }];
    const enqueteDoPost = (fim, extra = {}) => ({
      fim, encerrada: false, total: 1,
      opcoes: [{ id: 11, titulo: 'Help!', votos: 1 }, { id: 12, titulo: 'Yesterday', votos: 0 }], ...extra,
    });

    it('cria o post com a enquete e o fim calculado pela duração', async () => {
      await service.create(7, { texto: 'qual a melhor?', enquete: { opcoes, duracaoDias: 3 } });
      const criado = posts.create.mock.calls[0][0];
      expect(criado.enquete.opcoes.map((o) => o.titulo)).toEqual(['Help!', 'Yesterday']);
      expect(criado.enquete.fim).toEqual(new Date(now.getTime() + 3 * 86400000));
      expect(criado.nota).toBeNull();
    });

    it('pode ser só a enquete, sem texto', async () => {
      await service.create(7, { enquete: { opcoes } });
      expect(posts.create).toHaveBeenCalled();
    });

    it('combina com imagem, mas não com música avaliada', async () => {
      await service.create(7, { imagemUrl: 'https://res.cloudinary.com/x.gif', enquete: { opcoes } });
      expect(posts.create.mock.calls[0][0]).toMatchObject({ imagemUrl: 'https://res.cloudinary.com/x.gif' });

      await expect(service.create(7, { musicName: 'X', artistName: 'Y', postType: 'música', nota: 8, enquete: { opcoes } }))
        .rejects.toMatchObject({ status: 400, message: 'Post com enquete não pode ter música avaliada.' });
      await expect(service.create(7, { albumName: 'X', postType: 'album', nota: 8, enquete: { opcoes } }))
        .rejects.toMatchObject({ status: 400 });
      expect(posts.create).toHaveBeenCalledTimes(1);
    });

    it('recusa enquete em comentário ou inválida', async () => {
      await expect(service.create(7, { parentId: 1, enquete: { opcoes } }))
        .rejects.toMatchObject({ status: 400, message: 'Comentário não pode ter enquete.' });
      await expect(service.create(7, { enquete: { opcoes: [opcoes[0]] } })).rejects.toMatchObject({ status: 400 });
      await expect(service.create(7, { enquete: { opcoes: [{ ...opcoes[0], capa: 'https://outro.com/a.jpg' }, opcoes[1]] } }))
        .rejects.toMatchObject({ status: 400 });
      expect(posts.create).not.toHaveBeenCalled();
    });

    it('nas listas, marca em qual opção quem está vendo votou', async () => {
      posts.listLatest.mockResolvedValue([post(1), post(2, 3, { enquete: enqueteDoPost('2099-01-01T00:00:00.000Z') })]);
      posts.votosDe.mockResolvedValue(new Map([[2, 12]]));
      const feed = await service.forYou(9);
      expect(posts.votosDe).toHaveBeenCalledWith(9, [2]);
      expect(feed[1].enquete.meuVoto).toBe(12);
      expect(feed[0].enquete).toBeUndefined();
    });

    it('votar: registra e devolve a enquete atualizada com o voto', async () => {
      posts.findById.mockResolvedValue(post(5, 3, { enquete: enqueteDoPost('2099-01-01T00:00:00.000Z') }));
      expect(await service.votar(5, 9, '12')).toMatchObject({ total: 1, meuVoto: 12 });
      expect(posts.votar).toHaveBeenCalledWith(5, 9, 12);
    });

    it('votar avisa quem postou; votar na própria enquete não avisa', async () => {
      posts.findById.mockResolvedValue(post(5, 3, { enquete: enqueteDoPost('2099-01-01T00:00:00.000Z') }));
      await service.votar(5, 9, 12);
      expect(notifications.create).toHaveBeenCalledWith({
        destinatarioId: 3, autorId: 9, tipo: 'voto_enquete', conteudo: 'votou na sua enquete', postId: 5,
      });

      notifications.create.mockClear();
      await service.votar(5, 3, 12);
      expect(notifications.create).not.toHaveBeenCalled();
    });

    it('voto repetido não gera notificação', async () => {
      posts.findById.mockResolvedValue(post(5, 3, { enquete: enqueteDoPost('2099-01-01T00:00:00.000Z') }));
      posts.votar.mockResolvedValueOnce(false);
      await expect(service.votar(5, 9, 11)).rejects.toMatchObject({ status: 409 });
      expect(notifications.create).not.toHaveBeenCalled();
    });

    it('votar: recusa post sem enquete, enquete encerrada, opção de outra enquete e voto repetido', async () => {
      posts.findById.mockResolvedValueOnce(post(5));
      await expect(service.votar(5, 9, 11)).rejects.toMatchObject({ status: 400, message: 'Esse post não tem enquete.' });

      posts.findById.mockResolvedValue(post(5, 3, { enquete: enqueteDoPost('2000-01-01T00:00:00.000Z') }));
      await expect(service.votar(5, 9, 11)).rejects.toMatchObject({ status: 400, message: 'Essa enquete já terminou.' });

      posts.findById.mockResolvedValue(post(5, 3, { enquete: enqueteDoPost('2099-01-01T00:00:00.000Z') }));
      await expect(service.votar(5, 9, 99)).rejects.toMatchObject({ status: 400, message: 'Opção inválida.' });
      posts.votar.mockResolvedValueOnce(false);
      await expect(service.votar(5, 9, 11)).rejects.toMatchObject({ status: 409, message: 'Você já votou nessa enquete.' });
    });
  });

  describe('lista "Quero ouvir"', () => {
    let queroOuvir;
    beforeEach(() => {
      queroOuvir = { chaves: vi.fn().mockResolvedValue(new Set(['musica|help!|the beatles'])), remover: vi.fn() };
      service = createPostService({ posts, likes, notifications, users, queroOuvir, now: () => now });
    });

    it('marca nos posts com música se o disco está na lista de quem vê', async () => {
      posts.listLatest.mockResolvedValue([
        post(1, 2, { tipo: 'música', titulo: 'HELP!', artista: 'The Beatles' }),
        post(2, 2, { tipo: 'album', titulo: 'Help!', artista: 'The Beatles' }),
        post(3, 2, { titulo: null }),
      ]);
      const feed = await service.forYou(7);
      expect(queroOuvir.chaves).toHaveBeenCalledWith(7);
      expect(feed.map((p) => p.queroOuvir)).toEqual([true, false, undefined]);
    });

    it('avaliar um disco tira ele da lista; comentário e post sem música não mexem', async () => {
      await service.create(7, { musicName: 'Help!', artistName: 'The Beatles', postType: 'música', nota: 8 });
      expect(queroOuvir.remover).toHaveBeenCalledWith(7, 'musica|help!|the beatles');
      await service.create(7, { albumName: 'Abbey Road', artistName: 'The Beatles', postType: 'album', nota: 8 });
      expect(queroOuvir.remover).toHaveBeenLastCalledWith(7, 'album|abbey road|the beatles');

      queroOuvir.remover.mockClear();
      await service.create(7, { texto: 'oi' });
      await service.create(7, { musicName: 'Help!', artistName: 'The Beatles', nota: 8, parentId: 1 });
      expect(queroOuvir.remover).not.toHaveBeenCalled();
    });
  });

  describe('bloqueios e silêncios', () => {
    let restricoes;
    beforeEach(() => {
      restricoes = {
        ocultosPara: vi.fn().mockResolvedValue([3, 9]),
        relacao: vi.fn().mockResolvedValue({ bloqueado: false, meBloqueou: false, silenciado: false }),
      };
      service = createPostService({ posts, likes, notifications, users, restricoes, now: () => now });
    });
    const bloqueado = () => restricoes.relacao.mockResolvedValue({ bloqueado: false, meBloqueou: true, silenciado: false });

    it('os feeds, a hashtag e o disco pedem ao banco sem os posts de quem a pessoa não vê', async () => {
      await service.forYou(7);
      expect(restricoes.ocultosPara).toHaveBeenCalledWith(7);
      expect(posts.listLatest).toHaveBeenCalledWith({ ocultos: [3, 9] });
      await service.following(7);
      expect(posts.listFromFollowed).toHaveBeenCalledWith(7, { ocultos: [3, 9] });
      posts.listByHashtag = vi.fn().mockResolvedValue([]);
      await service.byHashtag('rock', 7);
      expect(posts.listByHashtag).toHaveBeenCalledWith('rock', { ocultos: [3, 9] });
    });

    it('post de quem bloqueou (ou foi bloqueado) não abre', async () => {
      bloqueado();
      await expect(service.get(1, 7)).rejects.toMatchObject({ status: 404 });
    });

    it('no post aberto, some o post respondido de quem a pessoa não vê', async () => {
      posts.findById.mockImplementation(async (id) => (id === 1 ? post(1, 2, { parentId: 50 }) : post(50, 9)));
      const { pai } = await service.get(1, 7);
      expect(pai).toBeNull();
      expect(posts.listReplies).toHaveBeenCalledWith(1, { ocultos: [3, 9] });
    });

    it('não dá para curtir, comentar nem votar entre quem se bloqueou', async () => {
      bloqueado();
      await expect(service.like(1, 7)).rejects.toMatchObject({ status: 403 });
      await expect(service.create(7, { texto: 'oi', parentId: 1 })).rejects.toMatchObject({ status: 403 });
      await expect(service.votar(1, 7, 11)).rejects.toMatchObject({ status: 403 });
      expect(likes.add).not.toHaveBeenCalled();
      expect(posts.create).not.toHaveBeenCalled();
    });

    it('comentários de alguém com bloqueio no meio voltam vazios', async () => {
      bloqueado();
      posts.listRepliesByAuthor = vi.fn();
      expect(await service.repliesByAuthor(2, 7)).toEqual([]);
      expect(posts.listRepliesByAuthor).not.toHaveBeenCalled();
    });
  });

  describe('obra (página do álbum ou música)', () => {
    const musica = (id, extra) => post(id, 2, { titulo: 'Help!', artista: 'The Beatles', capa: 'h.jpg', tipo: 'música', releaseDate: '138', preview: 'p.mp3', ...extra });

    beforeEach(() => {
      posts.listByObra = vi.fn().mockResolvedValue([musica(5), musica(4)]);
      posts.notasDaObra = vi.fn().mockResolvedValue([
        { autorId: 1, nota: 8 }, { autorId: 2, nota: 10 }, { autorId: 1, nota: 2 }, { autorId: 3, nota: 7 },
      ]);
    });

    it('traz a obra, a média com uma nota por pessoa (a mais recente) e os posts marcados', async () => {
      const resposta = await service.obra(7, { tipo: 'musica', titulo: ' help! ', artista: 'the beatles' });
      expect(posts.listByObra).toHaveBeenCalledWith({ tipo: 'musica', titulo: 'help!', artista: 'the beatles' }, { ocultos: [] });
      expect(resposta.obra).toEqual({
        tipo: 'musica', titulo: 'Help!', artista: 'The Beatles', capa: 'h.jpg', releaseDate: '138', preview: 'p.mp3',
      });
      expect(resposta.avaliacoes).toBe(3);
      expect(resposta.media).toBeCloseTo((8 + 10 + 7) / 3);
      expect(resposta.distribuicao).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1]);
      expect(resposta.posts.map((p) => [p.id, p.curtido])).toEqual([[5, false], [4, false]]);
    });

    it('a página seguinte só traz mais posts', async () => {
      const resposta = await service.obra(7, { tipo: 'album', titulo: 'Abbey Road', artista: 'The Beatles' }, { antes: '2024-01-02T00:00:00.000Z', antesId: '4' });
      expect(posts.listByObra).toHaveBeenCalledWith(
        { tipo: 'album', titulo: 'Abbey Road', artista: 'The Beatles' },
        { antes: { data: new Date('2024-01-02T00:00:00.000Z'), id: 4 }, ocultos: [] },
      );
      expect(posts.notasDaObra).not.toHaveBeenCalled();
      expect(Object.keys(resposta)).toEqual(['posts']);
    });

    it('sem nenhum post responde 404; tipo, título ou artista inválidos, 400', async () => {
      posts.listByObra.mockResolvedValue([]);
      await expect(service.obra(7, { tipo: 'musica', titulo: 'x', artista: 'y' })).rejects.toMatchObject({ status: 404 });
      for (const consulta of [{ tipo: 'artista', titulo: 'x', artista: 'y' }, { tipo: 'album', titulo: ' ', artista: 'y' }, { tipo: 'album', titulo: 'x' }, { tipo: 'album', titulo: 'x'.repeat(256), artista: 'y' }]) {
        await expect(service.obra(7, consulta)).rejects.toMatchObject({ status: 400 });
      }
    });
  });

  describe('recompensa dos 100 posts', () => {
    const PARABENS = {
      destinatarioId: 7,
      autorId: 7,
      tipo: 'marco_posts',
      conteudo: 'Parabéns pelos 100 posts!',
    };

    it('o 100º post desbloqueia o efeito (notas, oceano) e avisa, levando ao perfil', async () => {
      posts.countByAuthor.mockResolvedValue(100);
      await service.create(7, { texto: 'cem!' });
      expect(posts.countByAuthor).toHaveBeenCalledWith(7);
      expect(users.unlockEffect).toHaveBeenCalledWith(7, { tipo: 'notas', paleta: 'oceano' });
      expect(notifications.create).toHaveBeenCalledWith(PARABENS);
    });

    it('quem já tinha passado de 100 também ganha, no próximo post', async () => {
      posts.countByAuthor.mockResolvedValue(137);
      await service.create(7, { texto: 'oi' });
      expect(notifications.create).toHaveBeenCalledWith(PARABENS);
    });

    it('antes do 100º, nada', async () => {
      posts.countByAuthor.mockResolvedValue(99);
      await service.create(7, { texto: 'oi' });
      expect(users.unlockEffect).not.toHaveBeenCalled();
      expect(notifications.create).not.toHaveBeenCalled();
    });

    it('só uma vez: se o efeito já estava desbloqueado, não avisa de novo', async () => {
      posts.countByAuthor.mockResolvedValue(101);
      users.unlockEffect.mockResolvedValue(false);
      await service.create(7, { texto: 'oi' });
      expect(notifications.create).not.toHaveBeenCalled();
    });

    it('comentário não conta para os 100', async () => {
      posts.countByAuthor.mockResolvedValue(100);
      await service.create(7, { texto: 'oi', parentId: 1 });
      expect(posts.countByAuthor).not.toHaveBeenCalled();
      expect(notifications.create).not.toHaveBeenCalledWith(expect.objectContaining({ tipo: 'marco_posts' }));
    });

    it('verificarMarco confere sem precisar postar e diz se desbloqueou agora', async () => {
      posts.countByAuthor.mockResolvedValue(120);
      expect(await service.verificarMarco(7)).toBe(true);
      users.unlockEffect.mockResolvedValue(false);
      expect(await service.verificarMarco(7)).toBe(false);
      posts.countByAuthor.mockResolvedValue(50);
      expect(await service.verificarMarco(7)).toBe(false);
    });
  });

  describe('citar um post (repostar com comentário)', () => {
    it('cria o post citando e avisa o autor do citado, com o link da citação', async () => {
      posts.findById.mockResolvedValue(post(5, 3));
      await service.create(7, { texto: 'discordo dessa nota', citadoId: 5 });
      expect(posts.create).toHaveBeenCalledWith(expect.objectContaining({ citadoId: 5, texto: 'discordo dessa nota', autorId: 7 }));
      expect(notifications.create).toHaveBeenCalledWith({
        destinatarioId: 3, autorId: 7, tipo: 'citacao', conteudo: 'deu replay no seu post', postId: 42,
      });
    });

    it('dá para citar com música e nota', async () => {
      posts.findById.mockResolvedValue(post(5, 3));
      await service.create(7, { citadoId: 5, musicName: 'Help!', artistName: 'The Beatles', postType: 'música', nota: 8 });
      expect(posts.create).toHaveBeenCalledWith(expect.objectContaining({ citadoId: 5, musicName: 'Help!', nota: 8 }));
    });

    it('citar o próprio post não avisa; marcar quem foi citado não avisa duas vezes', async () => {
      posts.findById.mockResolvedValue(post(5, 7));
      await service.create(7, { texto: 'oi', citadoId: 5 });
      expect(notifications.create).not.toHaveBeenCalled();

      posts.findById.mockResolvedValue(post(5, 3));
      users.findByNames.mockResolvedValue([{ id: 3, nome: 'bia' }]);
      await service.create(7, { texto: '@bia olha isso', citadoId: 5 });
      expect(notifications.create).toHaveBeenCalledTimes(1);
      expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'citacao' }));
    });

    it('recusa citado inválido, apagado, ou citação em comentário', async () => {
      await expect(service.create(7, { texto: 'x', citadoId: 'abc' })).rejects.toMatchObject({ status: 400 });
      await expect(service.create(7, { texto: 'x', citadoId: 5, parentId: 1 })).rejects.toMatchObject({ status: 400 });
      posts.findById.mockResolvedValue(null);
      await expect(service.create(7, { texto: 'x', citadoId: 5 })).rejects.toMatchObject({ status: 404 });
      expect(posts.create).not.toHaveBeenCalled();
    });

    it('não dá para citar quem bloqueou ou foi bloqueado', async () => {
      const restricoes = {
        ocultosPara: vi.fn().mockResolvedValue([]),
        relacao: vi.fn().mockResolvedValue({ bloqueado: true, meBloqueou: false, silenciado: false }),
      };
      service = createPostService({ posts, likes, notifications, users, restricoes, now: () => now });
      posts.findById.mockResolvedValue(post(5, 3));
      await expect(service.create(7, { texto: 'x', citadoId: 5 })).rejects.toMatchObject({ status: 403 });
      expect(posts.create).not.toHaveBeenCalled();
    });

    it('nos feeds e no post aberto, a citação traz o post citado; apagado ou oculto fica indisponível', async () => {
      const restricoes = { ocultosPara: vi.fn().mockResolvedValue([9]), relacao: vi.fn().mockResolvedValue({}) };
      service = createPostService({ posts, likes, notifications, users, restricoes, now: () => now });
      posts.listLatest.mockResolvedValue([
        post(10, 2, { citadoId: 5 }), post(11, 2, { citadoId: 6 }), post(12, 2, { citadoId: 99 }), post(13, 2),
      ]);
      posts.findByIds = vi.fn().mockResolvedValue(new Map([[5, post(5, 3)], [6, post(6, 9)]]));

      const feed = await service.forYou(7);
      expect(posts.findByIds).toHaveBeenCalledWith([5, 6, 99]);
      expect(feed.map((p) => p.citado)).toEqual([post(5, 3), { indisponivel: true }, { indisponivel: true }, undefined]);

      posts.findById.mockResolvedValue(post(10, 2, { citadoId: 5 }));
      const aberto = await service.get(10, 7);
      expect(aberto.post.citado).toEqual(post(5, 3));
    });
  });

  describe('replays', () => {
    it('posts principais trazem quantos replays têm (sem os de quem quem vê não vê); comentários não', async () => {
      const restricoes = { ocultosPara: vi.fn().mockResolvedValue([9]), relacao: vi.fn().mockResolvedValue({}) };
      service = createPostService({ posts, likes, notifications, users, restricoes, now: () => now });
      posts.listLatest.mockResolvedValue([post(10), post(11), post(12, 2, { parentId: 10 })]);
      posts.contarReplays.mockResolvedValue(new Map([[10, 3]]));

      const feed = await service.forYou(7);
      expect(posts.contarReplays).toHaveBeenCalledWith([10, 11], { ocultos: [9] });
      expect(feed.map((p) => p.quantidadeReplays)).toEqual([3, 0, undefined]);
    });

    it('lista os replays de um post marcados para quem vê, sem os de quem quem vê não vê', async () => {
      const restricoes = { ocultosPara: vi.fn().mockResolvedValue([9]), relacao: vi.fn().mockResolvedValue({}) };
      service = createPostService({ posts, likes, notifications, users, restricoes, now: () => now });
      posts.listReplays.mockResolvedValue([post(3, 4, { citadoId: 1 })]);
      posts.findByIds = vi.fn().mockResolvedValue(new Map([[1, post(1)]]));

      const lista = await service.replays(1, 7);
      expect(posts.listReplays).toHaveBeenCalledWith(1, { ocultos: [9] });
      expect(lista).toEqual([{ ...post(3, 4, { citadoId: 1 }), curtido: true, quantidadeReplays: 0, citado: post(1) }]);
    });

    it('replays de post apagado ou de quem bloqueou quem vê: 404', async () => {
      posts.findById.mockResolvedValue(null);
      await expect(service.replays(1, 7)).rejects.toMatchObject({ status: 404 });

      const restricoes = { ocultosPara: vi.fn().mockResolvedValue([]), relacao: vi.fn().mockResolvedValue({ bloqueado: false, meBloqueou: true }) };
      service = createPostService({ posts, likes, notifications, users, restricoes, now: () => now });
      posts.findById.mockResolvedValue(post(1));
      await expect(service.replays(1, 7)).rejects.toMatchObject({ status: 404 });
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
        message: 'Dê uma nota de 0 a 5 estrelas.',
      });
    });

    it('rejeita nota fora de 0 a 10 ou quebrada', async () => {
      for (const nota of [-1, 11, 4.5, 'abc', '']) {
        await expect(service.create(7, { musicName: 'x', nota })).rejects.toMatchObject({
          status: 400,
          message: 'A nota vai de 0 a 5 estrelas, de meia em meia.',
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

    it('pode ser só uma imagem (sem texto nem música)', async () => {
      await service.create(7, { imagemUrl: 'https://res.cloudinary.com/x.gif' });
      expect(posts.create).toHaveBeenCalledWith({ imagemUrl: 'https://res.cloudinary.com/x.gif', nota: null, autorId: 7, data: now });
    });

    it('guarda a proporção da imagem cortada', async () => {
      await service.create(7, { imagemUrl: 'https://res.cloudinary.com/x.gif', imagemProporcao: '1.7778' });
      expect(posts.create.mock.calls[0][0].imagemProporcao).toBeCloseTo(1.7778);
    });

    it('recusa proporção absurda ou sem imagem', async () => {
      const erro = { status: 400, message: 'Proporção da imagem inválida.' };
      await expect(service.create(7, { imagemUrl: 'https://res.cloudinary.com/x.gif', imagemProporcao: 0 })).rejects.toMatchObject(erro);
      await expect(service.create(7, { imagemUrl: 'https://res.cloudinary.com/x.gif', imagemProporcao: 'abc' })).rejects.toMatchObject(erro);
      await expect(service.create(7, { imagemUrl: 'https://res.cloudinary.com/x.gif', imagemProporcao: 20 })).rejects.toMatchObject(erro);
      await expect(service.create(7, { texto: 'oi', imagemProporcao: 1 })).rejects.toMatchObject(erro);
    });

    describe('trecho da letra', () => {
      const musica = { musicName: 'Help!', artistName: 'The Beatles', postType: 'música', nota: 8 };

      it('guarda até 4 versos junto com a música', async () => {
        await service.create(7, { ...musica, trechoLetra: [' um ', 'dois'] });
        expect(posts.create.mock.calls[0][0].trechoLetra).toEqual(['um', 'dois']);
      });

      it('trecho vazio é ignorado', async () => {
        await service.create(7, { ...musica, trechoLetra: [] });
        expect(posts.create.mock.calls[0][0]).not.toHaveProperty('trechoLetra');
      });

      it('recusa trecho sem música, com álbum, longo demais ou em formato errado', async () => {
        await expect(service.create(7, { texto: 'oi', trechoLetra: ['um'] }))
          .rejects.toMatchObject({ status: 400, message: 'Escolha uma música para postar um trecho da letra.' });
        await expect(service.create(7, { albumName: 'Help!', postType: 'album', nota: 8, trechoLetra: ['um'] }))
          .rejects.toMatchObject({ status: 400 });
        await expect(service.create(7, { ...musica, trechoLetra: ['1', '2', '3', '4', '5'] }))
          .rejects.toMatchObject({ status: 400, message: 'Escolha no máximo 4 versos da letra.' });
        await expect(service.create(7, { ...musica, trechoLetra: 'um verso' }))
          .rejects.toMatchObject({ status: 400, message: 'Trecho da letra inválido.' });
        expect(posts.create).not.toHaveBeenCalled();
      });
    });

    it('sem música nem imagem, exige texto', async () => {
      await expect(service.create(7, { texto: '   ' })).rejects.toMatchObject({
        status: 400,
        message: 'Escreva algo, escolha uma música ou adicione uma imagem.',
      });
      expect(posts.create).not.toHaveBeenCalled();
    });

    describe('marcações (@usuario)', () => {
      it('notifica quem foi marcado no post', async () => {
        users.findByNames.mockResolvedValue([{ id: 5, nome: 'bia' }, { id: 6, nome: 'caio' }]);
        await service.create(7, { texto: 'olha isso @bia e @caio' });

        expect(users.findByNames).toHaveBeenCalledWith(['bia', 'caio']);
        expect(notifications.create).toHaveBeenCalledWith({
          destinatarioId: 5, autorId: 7, tipo: 'mention', conteudo: 'marcou você em um post', postId: 42,
        });
        expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({ destinatarioId: 6 }));
      });

      it('em comentário diz "em um comentário" e não notifica de novo o autor do post respondido', async () => {
        users.findByNames.mockResolvedValue([{ id: 2, nome: 'x' }, { id: 5, nome: 'bia' }]);
        await service.create(7, { texto: '@x @bia', parentId: 1 });

        const mencoes = notifications.create.mock.calls.map(([n]) => n).filter((n) => n.tipo === 'mention');
        expect(mencoes).toEqual([
          { destinatarioId: 5, autorId: 7, tipo: 'mention', conteudo: 'marcou você em um comentário', postId: 42 },
        ]);
      });

      it('quem se marca não recebe notificação; sem @ não consulta nada', async () => {
        users.findByNames.mockResolvedValue([{ id: 7, nome: 'eu' }]);
        await service.create(7, { texto: 'eu sou @eu' });
        expect(notifications.create).not.toHaveBeenCalled();

        users.findByNames.mockClear();
        await service.create(7, { texto: 'sem marcação' });
        expect(users.findByNames).not.toHaveBeenCalled();
      });
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

  describe('fixar no perfil', () => {
    it('o autor fixa o próprio post', async () => {
      await service.pin(1, 2);
      expect(users.setPinnedPost).toHaveBeenCalledWith(2, 1);
    });

    it('não fixa post de outra pessoa', async () => {
      await expect(service.pin(1, 7)).rejects.toMatchObject({ status: 403, message: 'Você só pode fixar seus próprios posts.' });
      expect(users.setPinnedPost).not.toHaveBeenCalled();
    });

    it('não fixa comentário', async () => {
      posts.findById.mockResolvedValue(post(1, 2, { parentId: 5 }));
      await expect(service.pin(1, 2)).rejects.toMatchObject({ status: 400, message: 'Só dá para fixar posts, não comentários.' });
    });

    it('lança 404 para post inexistente', async () => {
      posts.findById.mockResolvedValue(null);
      await expect(service.pin(1, 2)).rejects.toMatchObject({ status: 404 });
    });

    it('desafixa só se aquele post estiver fixado', async () => {
      posts.findById.mockResolvedValue(post(1, 2, { fixado: true }));
      await service.unpin(1, 2);
      expect(users.setPinnedPost).toHaveBeenCalledWith(2, null);

      users.setPinnedPost.mockClear();
      posts.findById.mockResolvedValue(post(1, 2, { fixado: false }));
      await service.unpin(1, 2);
      expect(users.setPinnedPost).not.toHaveBeenCalled();
    });

    it('não desafixa post de outra pessoa', async () => {
      posts.findById.mockResolvedValue(post(1, 2, { fixado: true }));
      await expect(service.unpin(1, 7)).rejects.toMatchObject({ status: 403 });
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

    it('curtir de novo depois de descurtir não avisa outra vez (spam de push em loop)', async () => {
      const vistos = new Set();
      const avisarUmaVez = vi.fn(async (chave) => !vistos.has(chave) && Boolean(vistos.add(chave)));
      service = createPostService({ posts, likes, notifications, users, now: () => now, avisarUmaVez });

      await service.like(1, 7);
      await service.unlike(1, 7);
      await service.like(1, 7);

      expect(avisarUmaVez).toHaveBeenCalledWith('like:1:7');
      expect(notifications.create).toHaveBeenCalledTimes(1);
      expect(likes.add).toHaveBeenCalledTimes(2);
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
