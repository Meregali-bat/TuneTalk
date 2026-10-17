import { describe, it, expect } from 'vitest';
import { transformLegacyData } from '../../src/migration/transform.js';

const table = (rows) => ({ columns: Object.keys(rows[0] ?? {}), rows });

const user = (id, extra = {}) => ({
  idusuario: id, nome: `u${id}`, email: `u${id}@x.com`, senha: 'md5', fotoPerfil: 'f.png', bio: null, admin: null, ...extra,
});
const post = (id, autor, extra = {}) => ({
  idpost: id, texto: 't', likes: 99, musicName: 'Help!', artistName: 'Beatles', posterMusica: 'p.jpg', albumName: null,
  posterAlbum: null, postType: 'música', releaseDate: '138', usuario_idusuario: autor, nota: 4,
  data: '2023-12-01 15:30:00', musicPreview: 'x.mp3', ...extra,
});

const legacy = (overrides = {}) => ({
  usuario: table([user(1, { admin: 1 }), user(2)]),
  post: table([post(10, 1)]),
  comentarios: table([{ idcomentarios: 5, texto: 'oi', likes: 0, post_idpost: 10, usuario_idusuario: 2 }]),
  curtir: table([{ post_idpost: 10, post_usuario_idusuario: 1, usuario_idusuario: 2 }]),
  seguir: table([{ usuario_idusuario: 2, usuario_idusuario1: 1 }]),
  notificacoes: table([
    { idnotificacoes: 1, usuario_idusuario: 1, usuario_idusuario1: 2, tipo: 'like', conteudo: 'curtiu seu post', data: '2023-12-02 10:00:00', lida: 1, post_id: 10 },
    { idnotificacoes: 2, usuario_idusuario: 1, usuario_idusuario1: 2, tipo: 'new_follower', conteudo: 'seguiu você', data: '2023-12-03 10:00:00', lida: 0, post_id: 0 },
  ]),
  ...overrides,
});

describe('transformLegacyData', () => {
  it('converte cada tabela para o novo modelo mantendo os ids', () => {
    const { data } = transformLegacyData(legacy());

    expect(data.usuarios).toEqual([
      { id: 1, nome: 'u1', email: 'u1@x.com', senha: 'md5', fotoPerfil: 'f.png', bio: null, admin: true },
      { id: 2, nome: 'u2', email: 'u2@x.com', senha: 'md5', fotoPerfil: 'f.png', bio: null, admin: false },
    ]);
    expect(data.posts).toEqual([{
      id: 10, autorId: 1, texto: 't', musicName: 'Help!', artistName: 'Beatles', posterMusica: 'p.jpg', albumName: null,
      posterAlbum: null, postType: 'música', releaseDate: '138', nota: 8, musicPreview: 'x.mp3',
      createdAt: new Date('2023-12-01T15:30:00Z'),
    }]);
    // Comentários viram respostas: posts sem música com o post comentado como pai.
    expect(data.respostas).toEqual([
      { id: 11, parentId: 10, autorId: 2, texto: 'oi', nota: null, createdAt: new Date('2023-12-01T15:30:00Z') },
    ]);
    expect(data.curtidas).toEqual([{ postId: 10, usuarioId: 2 }]);
    expect(data.seguimentos).toEqual([{ seguidorId: 2, seguidoId: 1 }]);
    expect(data.notificacoes).toEqual([
      { id: 1, destinatarioId: 1, autorId: 2, tipo: 'like', conteudo: 'curtiu seu post', lida: true, postId: 10, createdAt: new Date('2023-12-02T10:00:00Z') },
      { id: 2, destinatarioId: 1, autorId: 2, tipo: 'new_follower', conteudo: 'seguiu você', lida: false, postId: null, createdAt: new Date('2023-12-03T10:00:00Z') },
    ]);
  });

  it('descarta registros órfãos e explica o motivo no relatório', () => {
    const { data, report } = transformLegacyData(legacy({
      post: table([post(10, 1), post(11, 99)]),
      comentarios: table([{ idcomentarios: 5, texto: 'oi', likes: 0, post_idpost: 404, usuario_idusuario: 2 }]),
      curtir: table([{ post_idpost: 10, post_usuario_idusuario: 1, usuario_idusuario: 77 }]),
      seguir: table([{ usuario_idusuario: 2, usuario_idusuario1: 55 }]),
      notificacoes: table([
        { idnotificacoes: 3, usuario_idusuario: 1, usuario_idusuario1: 2, tipo: 'like', conteudo: 'x', data: '2023-12-02 10:00:00', lida: 0, post_id: 404 },
        { idnotificacoes: 4, usuario_idusuario: 1, usuario_idusuario1: 2, tipo: 'desconhecido', conteudo: 'x', data: '2023-12-02 10:00:00', lida: 0, post_id: 0 },
      ]),
    }));

    expect(data.posts.map((p) => p.id)).toEqual([10]);
    expect(data.respostas).toEqual([]);
    expect(data.curtidas).toEqual([]);
    expect(data.seguimentos).toEqual([]);
    expect(data.notificacoes).toEqual([]);
    expect(report.skipped).toEqual([
      { tabela: 'post', id: 11, motivo: 'autor 99 não existe' },
      { tabela: 'comentarios', id: 5, motivo: 'post 404 não existe' },
      { tabela: 'curtir', id: '10/77', motivo: 'usuário 77 não existe' },
      { tabela: 'seguir', id: '2/55', motivo: 'usuário 55 não existe' },
      { tabela: 'notificacoes', id: 3, motivo: 'post 404 não existe' },
      { tabela: 'notificacoes', id: 4, motivo: 'tipo "desconhecido" inválido' },
    ]);
  });

  it('mantém só o primeiro usuário quando o email se repete (ignorando maiúsculas)', () => {
    const { data, report } = transformLegacyData(legacy({
      usuario: table([user(1), user(2), user(3, { email: 'U1@X.com' })]),
    }));
    expect(data.usuarios.map((u) => u.id)).toEqual([1, 2]);
    expect(report.skipped).toContainEqual({ tabela: 'usuario', id: 3, motivo: 'email duplicado (já usado pelo usuário 1)' });
  });

  it('deixa sem nome o usuário cujo nome repete um anterior; ele escolhe outro no próximo login', () => {
    const { data, report } = transformLegacyData(legacy({
      usuario: table([user(1, { nome: 'Ana' }), user(2, { nome: 'ana' })]),
    }));
    expect(data.usuarios.map((u) => u.nome)).toEqual(['Ana', null]);
    expect(report.adjusted).toEqual([
      { tabela: 'usuario', id: 2, motivo: 'nome "ana" repetido; vai escolher outro no próximo login' },
    ]);
  });

  it('converte a nota antiga (0 a 5 estrelas) para a escala de 0 a 10', () => {
    const { data } = transformLegacyData(legacy({
      post: table([post(10, 1, { nota: 0 }), post(11, 1, { nota: 3 }), post(12, 1, { nota: 5 }), post(13, 1, { nota: null })]),
    }));
    expect(data.posts.map((p) => p.nota)).toEqual([0, 6, 10, 0]);
  });

  it('numera as respostas depois do maior id de post, na ordem dos comentários', () => {
    const { data } = transformLegacyData(legacy({
      post: table([post(10, 1), post(30, 2)]),
      comentarios: table([
        { idcomentarios: 9, texto: 'b', likes: 0, post_idpost: 10, usuario_idusuario: 1 },
        { idcomentarios: 4, texto: 'a', likes: 0, post_idpost: 30, usuario_idusuario: 2 },
      ]),
    }));
    expect(data.respostas.map((r) => [r.id, r.texto, r.parentId])).toEqual([[31, 'a', 30], [32, 'b', 10]]);
  });

  it('remove curtidas e seguimentos repetidos', () => {
    const { data } = transformLegacyData(legacy({
      curtir: table([
        { post_idpost: 10, post_usuario_idusuario: 1, usuario_idusuario: 2 },
        { post_idpost: 10, post_usuario_idusuario: 3, usuario_idusuario: 2 },
      ]),
      seguir: table([{ usuario_idusuario: 2, usuario_idusuario1: 1 }, { usuario_idusuario: 2, usuario_idusuario1: 1 }]),
    }));
    expect(data.curtidas).toHaveLength(1);
    expect(data.seguimentos).toHaveLength(1);
  });

  it('aceita tabelas ausentes no dump', () => {
    const { data } = transformLegacyData({ usuario: table([user(1)]) });
    expect(data.posts).toEqual([]);
    expect(data.notificacoes).toEqual([]);
  });

  it('resume quantos registros entram de cada tabela', () => {
    expect(transformLegacyData(legacy()).report.imported).toEqual({
      usuarios: 2, posts: 1, respostas: 1, curtidas: 1, seguimentos: 1, notificacoes: 2,
    });
  });
});
