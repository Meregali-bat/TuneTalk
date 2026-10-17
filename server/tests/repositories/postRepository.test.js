import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestDatabase, seed } from '../helpers/testDatabase.js';
import { createPostRepository } from '../../src/repositories/postRepository.js';

describe('postRepository (Postgres)', () => {
  let db;
  let repo;
  let factory;
  let ana;
  let bia;

  beforeAll(async () => {
    db = await createTestDatabase();
    repo = createPostRepository(db.prisma);
  });
  beforeEach(async () => {
    await db.reset();
    factory = seed(db.prisma);
    ana = await factory.user({ nome: 'Ana', fotoPerfil: 'ana.png' });
    bia = await factory.user({ nome: 'Bia' });
  });
  afterAll(() => db.close());

  describe('create + findById', () => {
    it('grava uma música e devolve no formato da API, com contagens', async () => {
      const data = new Date('2024-01-01T10:00:00Z');
      const id = await repo.create({
        autorId: ana.id,
        texto: 'que som',
        musicName: 'Help!',
        artistName: 'The Beatles',
        posterMusica: 'help.jpg',
        postType: 'música',
        releaseDate: '138',
        nota: 9,
        musicPreview: 'help.mp3',
        data,
      });
      await db.prisma.curtida.create({ data: { postId: id, usuarioId: bia.id } });
      await factory.reply(id, bia.id, { texto: 'oi' });

      expect(await repo.findById(id)).toEqual({
        id,
        parentId: null,
        texto: 'que som',
        likes: 1,
        nota: 9,
        data: '2024-01-01T10:00:00.000Z',
        quantidadeComentarios: 1,
        tipo: 'música',
        titulo: 'Help!',
        artista: 'The Beatles',
        capa: 'help.jpg',
        releaseDate: '138',
        preview: 'help.mp3',
        autor: { id: ana.id, nome: 'Ana', fotoPerfil: 'ana.png' },
      });
    });

    it('usa título e capa do álbum para posts de álbum', async () => {
      const id = await repo.create({
        autorId: ana.id, albumName: 'Abbey Road', posterAlbum: 'abbey.jpg', postType: 'album', releaseDate: '1969-09-26', data: new Date(),
      });
      expect(await repo.findById(id)).toMatchObject({ tipo: 'album', titulo: 'Abbey Road', capa: 'abbey.jpg', preview: null });
    });

    it('trata postType ausente ou "undefined" como música', async () => {
      const a = await factory.post(ana.id, { postType: null });
      const b = await factory.post(ana.id, { postType: 'undefined' });
      expect((await repo.findById(a.id)).tipo).toBe('música');
      expect((await repo.findById(b.id)).tipo).toBe('música');
    });

    it('usa texto vazio quando não informado', async () => {
      const id = await repo.create({ autorId: ana.id, musicName: 'x', nota: 0, data: new Date() });
      expect(await repo.findById(id)).toMatchObject({ texto: '', nota: 0 });
    });

    it('grava uma resposta sem música: sem tipo, título nem nota', async () => {
      const pai = await factory.post(ana.id);
      const id = await repo.create({ autorId: bia.id, parentId: pai.id, texto: 'concordo', data: new Date() });

      expect(await repo.findById(id)).toMatchObject({
        parentId: pai.id, texto: 'concordo', tipo: null, titulo: null, artista: null, capa: null, nota: null,
      });
    });

    it('findById devolve null para post inexistente', async () => {
      expect(await repo.findById(9999)).toBeNull();
    });
  });

  it('listLatest devolve os 20 mais recentes, do mais novo para o mais antigo', async () => {
    for (let i = 0; i < 22; i++) {
      await factory.post(ana.id, { texto: `p${i}`, createdAt: new Date(Date.UTC(2024, 0, i + 1)) });
    }
    const posts = await repo.listLatest();
    expect(posts).toHaveLength(20);
    expect(posts[0].texto).toBe('p21');
    expect(posts[19].texto).toBe('p2');
  });

  it('os feeds e o perfil não mostram respostas', async () => {
    const pai = await factory.post(bia.id);
    await factory.reply(pai.id, ana.id);
    await factory.reply(pai.id, bia.id);
    await db.prisma.seguimento.create({ data: { seguidorId: ana.id, seguidoId: bia.id } });

    expect((await repo.listLatest()).map((p) => p.id)).toEqual([pai.id]);
    expect(await repo.listByAuthor(ana.id)).toEqual([]);
    expect((await repo.listFromFollowed(ana.id)).map((p) => p.id)).toEqual([pai.id]);
  });

  it('listReplies devolve as respostas diretas, mais antigas primeiro, com suas contagens', async () => {
    const pai = await factory.post(ana.id);
    const primeira = await factory.reply(pai.id, bia.id, { createdAt: new Date('2024-01-01T10:00:00Z') });
    const segunda = await factory.reply(pai.id, ana.id, { createdAt: new Date('2024-01-01T11:00:00Z') });
    await factory.reply(primeira.id, ana.id);
    await factory.reply((await factory.post(bia.id)).id, ana.id);

    const respostas = await repo.listReplies(pai.id);
    expect(respostas.map((p) => [p.id, p.parentId, p.quantidadeComentarios])).toEqual([
      [primeira.id, pai.id, 1],
      [segunda.id, pai.id, 0],
    ]);
  });

  it('listByAuthor devolve só os posts do autor, mais novos primeiro', async () => {
    const p1 = await factory.post(ana.id);
    await factory.post(bia.id);
    const p3 = await factory.post(ana.id);
    expect((await repo.listByAuthor(ana.id)).map((p) => p.id)).toEqual([p3.id, p1.id]);
  });

  it('listFromFollowed devolve posts de quem o usuário segue', async () => {
    const caio = await factory.user();
    const deBia = await factory.post(bia.id);
    await factory.post(caio.id);
    await factory.post(ana.id);
    await db.prisma.seguimento.create({ data: { seguidorId: ana.id, seguidoId: bia.id } });

    expect((await repo.listFromFollowed(ana.id)).map((p) => p.id)).toEqual([deBia.id]);
  });

  it('remove apaga o post junto com respostas, curtidas e notificações (cascade)', async () => {
    const post = await factory.post(ana.id);
    await db.prisma.curtida.create({ data: { postId: post.id, usuarioId: bia.id } });
    const resposta = await factory.reply(post.id, bia.id);
    await factory.reply(resposta.id, ana.id);
    await db.prisma.notificacao.create({
      data: { postId: post.id, destinatarioId: ana.id, autorId: bia.id, tipo: 'like', conteudo: 'curtiu seu post' },
    });

    await repo.remove(post.id);

    expect(await repo.findById(post.id)).toBeNull();
    expect(await db.prisma.curtida.count()).toBe(0);
    expect(await db.prisma.post.count()).toBe(0);
    expect(await db.prisma.notificacao.count()).toBe(0);
  });
});
