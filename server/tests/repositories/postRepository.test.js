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
        imagem: null,
        imagemProporcao: null,
        trechoLetra: null,
        enquete: null,
        fixado: false,
        autor: { id: ana.id, nome: 'Ana', nomeExibicao: null, fotoPerfil: 'ana.png', fundador: false },
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

    it('grava e devolve a imagem do post', async () => {
      const url = 'https://res.cloudinary.com/t/image/upload/v1/tunetalk/posts/a.gif';
      const id = await repo.create({ autorId: ana.id, texto: 'olha', imagemUrl: url, imagemProporcao: 0.8, data: new Date() });
      expect(await repo.findById(id)).toMatchObject({ imagem: url, imagemProporcao: 0.8, titulo: null, nota: null });
    });

    it('grava e devolve o trecho da letra (um verso por linha)', async () => {
      const id = await repo.create({
        autorId: ana.id, texto: '', musicName: 'Help!', artistName: 'The Beatles', postType: 'música', nota: 8,
        trechoLetra: ['primeiro verso', 'segundo verso'], data: new Date(),
      });
      expect((await repo.findById(id)).trechoLetra).toEqual(['primeiro verso', 'segundo verso']);
    });

    it('enquete: grava as opções na ordem, conta votos (um por pessoa) e diz em qual cada um votou', async () => {
      const bia = await factory.user();
      const fim = new Date(Date.now() + 86400000);
      const opcoes = [
        { titulo: 'Help!', artista: 'The Beatles', capa: 'h.jpg', preview: null },
        { titulo: 'Yesterday', artista: 'The Beatles', capa: 'y.jpg', preview: 'https://p/y.mp3' },
      ];
      const id = await repo.create({ autorId: ana.id, texto: 'qual?', enquete: { opcoes, fim }, data: new Date() });

      const [help, yesterday] = (await repo.findById(id)).enquete.opcoes;
      expect(help).toEqual({ id: help.id, titulo: 'Help!', artista: 'The Beatles', capa: 'h.jpg', preview: null, votos: 0 });
      expect(await repo.votar(id, ana.id, yesterday.id)).toBe(true);
      expect(await repo.votar(id, bia.id, yesterday.id)).toBe(true);
      expect(await repo.votar(id, bia.id, help.id)).toBe(false);

      const { enquete } = await repo.findById(id);
      expect(enquete).toMatchObject({ fim: fim.toISOString(), encerrada: false, total: 2 });
      expect(enquete.opcoes.map((o) => o.votos)).toEqual([0, 2]);
      expect(await repo.votosDe(bia.id, [id, 999])).toEqual(new Map([[id, yesterday.id]]));
      expect(await repo.votosDe(bia.id, [])).toEqual(new Map());
    });

    it('findById devolve null para post inexistente', async () => {
      expect(await repo.findById(9999)).toBeNull();
    });
  });

  it('listLatest devolve os mais recentes (50 por padrão), do mais novo para o mais antigo', async () => {
    for (let i = 0; i < 5; i++) {
      await factory.post(ana.id, { texto: `p${i}`, createdAt: new Date(Date.UTC(2024, 0, i + 1)) });
    }
    expect((await repo.listLatest()).map((p) => p.texto)).toEqual(['p4', 'p3', 'p2', 'p1', 'p0']);
    expect((await repo.listLatest(3)).map((p) => p.texto)).toEqual(['p4', 'p3', 'p2']);
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

  it('marca como fixado só o post que o autor fixou no perfil', async () => {
    const p1 = await factory.post(ana.id);
    const p2 = await factory.post(ana.id);
    await db.prisma.usuario.update({ where: { id: ana.id }, data: { postFixadoId: p1.id } });

    expect((await repo.listByAuthor(ana.id)).map((p) => [p.id, p.fixado])).toEqual([[p2.id, false], [p1.id, true]]);
    expect((await repo.findById(p1.id)).autor).toEqual({ id: ana.id, nome: 'Ana', nomeExibicao: null, fotoPerfil: 'ana.png', fundador: false });

    await db.prisma.usuario.update({ where: { id: ana.id }, data: { fundadorDesde: new Date() } });
    expect((await repo.findById(p1.id)).autor.fundador).toBe(true);

    // Quem escolheu esconder a medalha não aparece como fundador nos posts.
    await db.prisma.usuario.update({ where: { id: ana.id }, data: { mostrarSeloFundador: false } });
    expect((await repo.findById(p1.id)).autor.fundador).toBe(false);
  });

  it('apagar o post fixado deixa o perfil sem post fixado', async () => {
    const post = await factory.post(ana.id);
    await db.prisma.usuario.update({ where: { id: ana.id }, data: { postFixadoId: post.id } });
    await repo.remove(post.id);
    expect((await db.prisma.usuario.findUnique({ where: { id: ana.id } })).postFixadoId).toBeNull();
  });

  it('listFirstReplies devolve a primeira resposta de cada comentário, numa consulta só', async () => {
    const pai = await factory.post(ana.id);
    const c1 = await factory.reply(pai.id, bia.id);
    const c2 = await factory.reply(pai.id, ana.id);
    const c3 = await factory.reply(pai.id, ana.id);
    const r1a = await factory.reply(c1.id, ana.id, { texto: 'primeira', createdAt: new Date('2024-01-01T10:00:00Z') });
    await factory.reply(c1.id, bia.id, { texto: 'segunda', createdAt: new Date('2024-01-01T11:00:00Z') });
    const r2a = await factory.reply(c2.id, bia.id);

    const primeiras = await repo.listFirstReplies([c1.id, c2.id, c3.id]);

    expect(primeiras.get(c1.id)).toMatchObject({ id: r1a.id, texto: 'primeira', parentId: c1.id });
    expect(primeiras.get(c2.id)).toMatchObject({ id: r2a.id });
    expect(primeiras.has(c3.id)).toBe(false);
    expect((await repo.listFirstReplies([])).size).toBe(0);
  });

  it('listByHashtag acha posts e comentários com a hashtag inteira, mais novos primeiro', async () => {
    const velho = await factory.post(ana.id, { texto: 'ouvindo #Rock', createdAt: new Date('2024-01-01') });
    const novo = await factory.post(bia.id, { texto: 'mais #rock aqui', createdAt: new Date('2024-02-01') });
    const comentario = await factory.reply(velho.id, bia.id, { texto: 'adoro #ROCK', createdAt: new Date('2024-03-01') });
    await factory.post(ana.id, { texto: 'só #rockabilly' });
    await factory.post(ana.id, { texto: 'sem hashtag rock' });

    expect((await repo.listByHashtag('rock')).map((p) => p.id)).toEqual([comentario.id, novo.id, velho.id]);
  });

  it('listRepliesByAuthor devolve os comentários da pessoa (mais novos primeiro) com quem ela respondeu', async () => {
    const doBia = await factory.post(bia.id);
    const c1 = await factory.reply(doBia.id, ana.id, { texto: 'primeiro', createdAt: new Date('2024-01-01') });
    const c2 = await factory.reply(c1.id, ana.id, { texto: 'segundo', createdAt: new Date('2024-02-01') });
    await factory.reply(doBia.id, bia.id);
    await factory.post(ana.id);

    const comentarios = await repo.listRepliesByAuthor(ana.id);
    expect(comentarios.map((c) => [c.id, c.texto])).toEqual([[c2.id, 'segundo'], [c1.id, 'primeiro']]);
    expect(comentarios[0].respondendoA).toEqual({ postId: c1.id, nome: 'Ana' });
    expect(comentarios[1].respondendoA).toEqual({ postId: doBia.id, nome: 'Bia' });
  });

  it('listHashtagTexts devolve os textos com # (filtrando por data e por pedaço da tag)', async () => {
    await factory.post(ana.id, { texto: 'velho #rock', createdAt: new Date('2024-01-01') });
    await factory.post(ana.id, { texto: 'novo #Guts', createdAt: new Date('2024-06-01') });
    await factory.post(ana.id, { texto: 'sem tag', createdAt: new Date('2024-06-02') });

    expect(await repo.listHashtagTexts({ limite: 10 })).toEqual(['novo #Guts', 'velho #rock']);
    expect(await repo.listHashtagTexts({ desde: new Date('2024-03-01'), limite: 10 })).toEqual(['novo #Guts']);
    expect(await repo.listHashtagTexts({ contem: 'gu', limite: 10 })).toEqual(['novo #Guts']);
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
