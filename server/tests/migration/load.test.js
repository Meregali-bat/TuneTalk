import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestDatabase } from '../helpers/testDatabase.js';
import { loadIntoDatabase } from '../../src/migration/load.js';

const data = () => ({
  usuarios: [
    { id: 11, nome: 'Ana', email: 'ana@x.com', senha: 'h', fotoPerfil: 'a.png', bio: null, admin: false },
    { id: 40, nome: 'Bia', email: 'bia@x.com', senha: 'h', fotoPerfil: 'b.png', bio: 'rock', admin: true },
  ],
  posts: [{
    id: 300, autorId: 11, texto: 't', musicName: 'Help!', artistName: 'Beatles', posterMusica: 'p', albumName: null,
    posterAlbum: null, postType: 'música', releaseDate: '138', nota: 4, musicPreview: null, createdAt: new Date('2023-12-01T00:00:00Z'),
  }],
  respostas: [{ id: 301, parentId: 300, autorId: 40, texto: 'oi', nota: null, createdAt: new Date('2023-12-01T00:00:00Z') }],
  curtidas: [{ postId: 300, usuarioId: 40 }],
  seguimentos: [{ seguidorId: 40, seguidoId: 11 }],
  notificacoes: [{ id: 9, destinatarioId: 11, autorId: 40, tipo: 'like', conteudo: 'curtiu seu post', lida: false, postId: 300, createdAt: new Date() }],
});

describe('loadIntoDatabase (Postgres)', () => {
  let db;

  beforeAll(async () => { db = await createTestDatabase(); });
  beforeEach(() => db.reset());
  afterAll(() => db.close());

  it('insere tudo preservando os ids', async () => {
    await loadIntoDatabase(db.prisma, data());

    expect(await db.prisma.usuario.findUnique({ where: { id: 40 } })).toMatchObject({ nome: 'Bia', admin: true });
    expect(await db.prisma.post.findUnique({ where: { id: 300 } })).toMatchObject({ autorId: 11 });
    expect(await db.prisma.post.findUnique({ where: { id: 301 } })).toMatchObject({ parentId: 300, nota: null });
    expect(await db.prisma.curtida.count()).toBe(1);
    expect(await db.prisma.seguimento.count()).toBe(1);
    expect(await db.prisma.notificacao.count()).toBe(1);
  });

  it('ajusta as sequências para que novos registros continuem depois dos ids migrados', async () => {
    await loadIntoDatabase(db.prisma, data());

    const novoUsuario = await db.prisma.usuario.create({ data: { nome: 'Novo', email: 'novo@x.com', senha: 'h' } });
    const novoPost = await db.prisma.post.create({ data: { autorId: 11, texto: 'x' } });
    const novaNotificacao = await db.prisma.notificacao.create({
      data: { destinatarioId: 11, autorId: 40, tipo: 'comment', conteudo: 'x' },
    });

    expect(novoUsuario.id).toBe(41);
    expect(novoPost.id).toBe(302);
    expect(novaNotificacao.id).toBe(10);
  });

  it('recusa carregar em um banco que já tem usuários', async () => {
    await db.prisma.usuario.create({ data: { nome: 'X', email: 'x@x.com', senha: 'h' } });
    await expect(loadIntoDatabase(db.prisma, data())).rejects.toThrow(/banco de destino não está vazio/);
  });

  it('funciona com tabelas vazias', async () => {
    await loadIntoDatabase(db.prisma, { ...data(), posts: [], respostas: [], curtidas: [], notificacoes: [] });
    const novoPost = await db.prisma.post.create({ data: { autorId: 11, texto: 'x' } });
    expect(novoPost.id).toBe(1);
  });
});
