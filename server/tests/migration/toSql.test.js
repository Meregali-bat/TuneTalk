import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestDatabase } from '../helpers/testDatabase.js';
import { toSql } from '../../src/migration/toSql.js';

const data = () => ({
  usuarios: [
    { id: 11, nome: "Ana d'Ávila", email: 'ana@x.com', senha: 'h', fotoPerfil: 'a.png', bio: 'linha 1\nlinha 2', admin: false },
    { id: 40, nome: null, email: 'bia@x.com', senha: 'h', fotoPerfil: null, bio: null, admin: true },
  ],
  posts: [{
    id: 300, autorId: 11, texto: "it's \\ ok", musicName: 'Help!', artistName: 'Beatles', posterMusica: 'p', albumName: null,
    posterAlbum: null, postType: 'música', releaseDate: '138', nota: 8, musicPreview: null, createdAt: new Date('2023-12-01T10:00:00Z'),
  }],
  respostas: [{ id: 301, parentId: 300, autorId: 40, texto: 'oi', nota: null, createdAt: new Date('2023-12-01T10:00:00Z') }],
  curtidas: [{ postId: 300, usuarioId: 40 }],
  seguimentos: [{ seguidorId: 40, seguidoId: 11 }],
  notificacoes: [
    { id: 9, destinatarioId: 11, autorId: 40, tipo: 'like', conteudo: 'curtiu seu post', lida: true, postId: 300, createdAt: new Date('2023-12-02T00:00:00Z') },
    { id: 10, destinatarioId: 11, autorId: 40, tipo: 'new_follower', conteudo: 'seguiu você', lida: false, postId: null, createdAt: new Date('2023-12-03T00:00:00Z') },
  ],
});

// Executa o SQL gerado num banco com as migrations aplicadas, como o SQL Editor do Neon faria.
describe('toSql (importação pelo SQL Editor)', () => {
  let db;

  beforeAll(async () => { db = await createTestDatabase(); });
  beforeEach(() => db.reset());
  afterAll(() => db.close());

  it('insere tudo com os mesmos ids, textos com aspas e quebras de linha intactos', async () => {
    await db.exec(toSql(data()));

    expect(await db.prisma.usuario.findUnique({ where: { id: 11 } })).toMatchObject({ nome: "Ana d'Ávila", bio: 'linha 1\nlinha 2', admin: false });
    expect(await db.prisma.usuario.findUnique({ where: { id: 40 } })).toMatchObject({ nome: null, fotoPerfil: null, admin: true });
    expect(await db.prisma.post.findUnique({ where: { id: 300 } })).toMatchObject({
      texto: "it's \\ ok", postType: 'música', nota: 8, parentId: null, createdAt: new Date('2023-12-01T10:00:00Z'),
    });
    expect(await db.prisma.post.findUnique({ where: { id: 301 } })).toMatchObject({ parentId: 300, nota: null });
    expect(await db.prisma.curtida.count()).toBe(1);
    expect(await db.prisma.seguimento.count()).toBe(1);
    expect((await db.prisma.notificacao.findMany({ orderBy: { id: 'asc' } })).map((n) => [n.id, n.tipo, n.lida, n.postId]))
      .toEqual([[9, 'like', true, 300], [10, 'new_follower', false, null]]);
  });

  it('ajusta as sequências para os próximos cadastros', async () => {
    await db.exec(toSql(data()));
    expect((await db.prisma.usuario.create({ data: { email: 'n@x.com', senha: 'h' } })).id).toBe(41);
    expect((await db.prisma.post.create({ data: { autorId: 11, texto: 'x' } })).id).toBe(302);
    expect((await db.prisma.notificacao.create({ data: { destinatarioId: 11, autorId: 40, tipo: 'like', conteudo: 'x' } })).id).toBe(11);
  });

  it('não grava nada se o banco já tiver usuários', async () => {
    await db.prisma.usuario.create({ data: { email: 'ja@x.com', senha: 'h' } });
    await expect(db.exec(toSql(data()))).rejects.toThrow(/não está vazio/);
    await db.exec('ROLLBACK'); // o editor do Neon abre uma sessão nova a cada execução
    expect(await db.prisma.post.count()).toBe(0);
  });
});
