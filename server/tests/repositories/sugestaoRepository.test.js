import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestDatabase, seed } from '../helpers/testDatabase.js';
import { createSugestaoRepository } from '../../src/repositories/sugestaoRepository.js';

describe('sugestaoRepository (Postgres)', () => {
  let db;
  let repo;
  let factory;
  let ana;
  let bia;
  let caio;

  beforeAll(async () => {
    db = await createTestDatabase();
    repo = createSugestaoRepository(db.prisma);
  });
  beforeEach(async () => {
    await db.reset();
    factory = seed(db.prisma);
    ana = await factory.user({ nome: 'Ana' });
    bia = await factory.user({ nome: 'Bia' });
    caio = await factory.user({ nome: 'Caio' });
  });
  afterAll(() => db.close());

  const avaliar = (autorId, titulo, nota, extra = {}) => factory.post(autorId, { musicName: titulo, nota, ...extra });

  it('parecidos: discos em comum e diferença média, com a nota mais recente de cada um', async () => {
    await avaliar(ana.id, 'Help!', 8);
    await avaliar(ana.id, 'Yesterday', 10);
    await avaliar(bia.id, 'HELP!', 2, { createdAt: new Date(Date.UTC(2020, 0, 1)) });
    await avaliar(bia.id, 'help!', 6, { createdAt: new Date(Date.UTC(2024, 0, 1)) });
    await avaliar(bia.id, 'Yesterday', 10);
    await avaliar(caio.id, 'Help!', 0);
    // Álbum com o mesmo nome não é a mesma coisa que a música; comentário não conta.
    await factory.post(caio.id, { musicName: null, albumName: 'Yesterday', postType: 'album', nota: 10 });
    const pai = await avaliar(caio.id, 'Outra', 5);
    await factory.reply(pai.id, bia.id, { musicName: 'Outra', artistName: 'The Beatles', nota: 5 });

    const rows = (await repo.parecidos(ana.id)).sort((a, b) => a.autorId - b.autorId);
    expect(rows).toEqual([
      { autorId: bia.id, emComum: 2, diferenca: 1 },
      { autorId: caio.id, emComum: 1, diferenca: 8 },
    ]);
  });

  it('ativos: quem mais postou (sem contar comentários), desde uma data ou de sempre', async () => {
    await factory.post(bia.id);
    await factory.post(bia.id);
    await factory.post(caio.id, { createdAt: new Date(Date.UTC(2020, 0, 1)) });
    const pai = await factory.post(ana.id);
    await factory.reply(pai.id, caio.id);
    await factory.reply(pai.id, caio.id);

    expect(await repo.ativos({ limite: 10 })).toEqual([
      { autorId: bia.id, posts: 2 },
      expect.objectContaining({ posts: 1 }),
      expect.objectContaining({ posts: 1 }),
    ]);
    const recentes = await repo.ativos({ desde: new Date(Date.UTC(2023, 0, 1)), limite: 10 });
    expect(recentes.map((r) => r.autorId)).not.toContain(caio.id);
  });

  it('usuarios: só contas com nome de usuário', async () => {
    const semNome = await db.prisma.usuario.create({ data: { email: 'novo@x.com', senha: 'x', fotoPerfil: 'f.png' } });
    const achados = await repo.usuarios([bia.id, semNome.id]);
    expect(achados.map((u) => u.nome)).toEqual(['Bia']);
    expect(await repo.usuarios([])).toEqual([]);
  });
});
