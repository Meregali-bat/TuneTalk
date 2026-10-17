import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPostRepository, toPost } from '../../src/repositories/postRepository.js';

const musicRow = {
  idpost: 10,
  texto: 'que som',
  likes: 3,
  musicName: 'Help!',
  artistName: 'The Beatles',
  posterMusica: 'help.jpg',
  albumName: null,
  posterAlbum: null,
  postType: 'música',
  releaseDate: '138',
  usuario_idusuario: 7,
  nota: 4.5,
  data: new Date('2024-01-01T10:00:00Z'),
  musicPreview: 'help.mp3',
  autor: 'Ana',
  fotoPerfil: 'ana.png',
  autorId: 7,
  quantidadeComentarios: 2,
};

describe('toPost', () => {
  it('converte uma linha de música no formato da API', () => {
    expect(toPost(musicRow)).toEqual({
      id: 10,
      texto: 'que som',
      likes: 3,
      nota: 4.5,
      data: '2024-01-01T10:00:00.000Z',
      quantidadeComentarios: 2,
      tipo: 'música',
      titulo: 'Help!',
      artista: 'The Beatles',
      capa: 'help.jpg',
      releaseDate: '138',
      preview: 'help.mp3',
      autor: { id: 7, nome: 'Ana', fotoPerfil: 'ana.png' },
    });
  });

  it('usa nome e capa do álbum quando o post é de álbum', () => {
    const post = toPost({
      ...musicRow,
      postType: 'album',
      musicName: null,
      posterMusica: null,
      albumName: 'Abbey Road',
      posterAlbum: 'abbey.jpg',
      musicPreview: null,
    });
    expect(post).toMatchObject({ tipo: 'album', titulo: 'Abbey Road', capa: 'abbey.jpg', preview: null });
  });

  it('trata postType ausente ou "undefined" como música', () => {
    expect(toPost({ ...musicRow, postType: 'undefined' }).tipo).toBe('música');
    expect(toPost({ ...musicRow, postType: null }).tipo).toBe('música');
  });

  it('aceita linhas sem o alias "autor" (usa nome) e sem contagem de comentários', () => {
    const { autor, autorId, quantidadeComentarios, ...rest } = musicRow;
    const post = toPost({ ...rest, nome: 'Ana' });
    expect(post.autor).toEqual({ id: 7, nome: 'Ana', fotoPerfil: 'ana.png' });
    expect(post.quantidadeComentarios).toBe(0);
  });
});

describe('postRepository', () => {
  let db;
  let repo;

  beforeEach(() => {
    db = { query: vi.fn() };
    repo = createPostRepository(db);
  });

  it('listLatest busca os 20 mais recentes', async () => {
    db.query.mockResolvedValue([musicRow]);
    const posts = await repo.listLatest();
    expect(db.query.mock.calls[0][0]).toMatch(/ORDER BY post\.data DESC\s+LIMIT 20/);
    expect(posts).toEqual([toPost(musicRow)]);
  });

  it('listByAuthor filtra pelo autor', async () => {
    db.query.mockResolvedValue([musicRow]);
    expect(await repo.listByAuthor(7)).toEqual([toPost(musicRow)]);
    expect(db.query).toHaveBeenCalledWith(expect.stringMatching(/WHERE usuario_idusuario = :p_idusuario/), { p_idusuario: 7 });
  });

  it('listFromFollowed junta com a tabela seguir', async () => {
    db.query.mockResolvedValue([musicRow]);
    expect(await repo.listFromFollowed(1)).toEqual([toPost(musicRow)]);
    expect(db.query).toHaveBeenCalledWith(expect.stringMatching(/JOIN seguir/), { p_idusuario: 1 });
  });

  describe('findById', () => {
    it('devolve o post', async () => {
      db.query.mockResolvedValue([musicRow]);
      expect(await repo.findById(10)).toEqual(toPost(musicRow));
      expect(db.query).toHaveBeenCalledWith(expect.any(String), { p_idpost: 10 });
    });

    it('devolve null quando não existe', async () => {
      db.query.mockResolvedValue([]);
      expect(await repo.findById(10)).toBeNull();
    });
  });

  it('create grava os campos de música e de álbum', async () => {
    db.query.mockResolvedValue({ insertId: 11 });
    const data = new Date('2024-02-02T00:00:00Z');

    const id = await repo.create({
      autorId: 7,
      texto: 'oi',
      musicName: 'Help!',
      artistName: 'Beatles',
      posterMusica: 'p.jpg',
      postType: 'música',
      releaseDate: '138',
      nota: '4',
      musicPreview: 'x.mp3',
      data,
    });

    expect(id).toBe(11);
    expect(db.query).toHaveBeenCalledWith(expect.stringMatching(/INSERT INTO post/), {
      p_texto: 'oi',
      p_usuario_idusuario: 7,
      p_likes: 0,
      p_musicName: 'Help!',
      p_artistName: 'Beatles',
      p_posterMusica: 'p.jpg',
      p_albumName: null,
      p_posterAlbum: null,
      p_postType: 'música',
      p_releaseDate: '138',
      p_nota: '4',
      p_data: data,
      p_musicPreview: 'x.mp3',
    });
  });

  it('create usa nota 0 e texto vazio quando não informados', async () => {
    db.query.mockResolvedValue({ insertId: 1 });
    await repo.create({ autorId: 7, data: new Date() });
    expect(db.query.mock.calls[0][1]).toMatchObject({ p_nota: 0, p_texto: '' });
  });

  it('remove apaga comentários, curtidas, notificações e o post', async () => {
    db.query.mockResolvedValue({});
    await repo.remove(10);
    const sqls = db.query.mock.calls.map(([sql]) => sql);
    expect(sqls).toEqual([
      expect.stringMatching(/DELETE FROM comentarios/),
      expect.stringMatching(/DELETE FROM curtir/),
      expect.stringMatching(/DELETE FROM notificacoes/),
      expect.stringMatching(/DELETE FROM post/),
    ]);
    db.query.mock.calls.forEach(([, params]) => expect(params).toEqual({ p_idpost: 10 }));
  });

  it('incrementLikes / decrementLikes atualizam o contador e devolvem o novo valor', async () => {
    db.query.mockResolvedValueOnce({}).mockResolvedValueOnce([{ likes: 4 }]);
    expect(await repo.incrementLikes(10)).toBe(4);
    expect(db.query.mock.calls[0][0]).toMatch(/likes = likes \+ 1/);

    db.query.mockResolvedValueOnce({}).mockResolvedValueOnce([{ likes: 3 }]);
    expect(await repo.decrementLikes(10)).toBe(3);
    expect(db.query.mock.calls[2][0]).toMatch(/likes = GREATEST\(likes - 1, 0\)/);
  });

  it('getLikeCount devolve as curtidas atuais', async () => {
    db.query.mockResolvedValue([{ likes: 8 }]);
    expect(await repo.getLikeCount(10)).toBe(8);
  });
});
