import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestDatabase, seed } from '../helpers/testDatabase.js';
import { createQueroOuvirRepository } from '../../src/repositories/queroOuvirRepository.js';

describe('queroOuvirRepository (Postgres)', () => {
  let db;
  let repo;
  let ana;
  let bia;
  const abbey = { tipo: 'album', titulo: 'Abbey Road', artista: 'The Beatles', capa: 'a.jpg', releaseDate: '1969', preview: null, chave: 'album|abbey road|the beatles' };
  const help = { tipo: 'musica', titulo: 'Help!', artista: 'The Beatles', capa: 'h.jpg', releaseDate: '138', preview: 'p.mp3', chave: 'musica|help!|the beatles' };

  beforeAll(async () => {
    db = await createTestDatabase();
    repo = createQueroOuvirRepository(db.prisma);
  });
  beforeEach(async () => {
    await db.reset();
    const factory = seed(db.prisma);
    ana = await factory.user({ nome: 'Ana' });
    bia = await factory.user({ nome: 'Bia' });
  });
  afterAll(() => db.close());

  it('adiciona sem duplicar, lista da mais nova para a mais antiga e é de cada pessoa', async () => {
    await repo.adicionar(ana.id, abbey);
    await repo.adicionar(ana.id, help);
    await repo.adicionar(ana.id, abbey);
    await repo.adicionar(bia.id, help);

    const lista = await repo.listar(ana.id);
    expect(lista.map((i) => i.titulo)).toEqual(['Help!', 'Abbey Road']);
    expect(lista[0]).toMatchObject({ tipo: 'musica', artista: 'The Beatles', capa: 'h.jpg', releaseDate: '138', preview: 'p.mp3' });
    expect(typeof lista[0].data).toBe('string');
    expect(await repo.chaves(ana.id)).toEqual(new Set([abbey.chave, help.chave]));
  });

  it('remove pela chave, só da pessoa', async () => {
    await repo.adicionar(ana.id, abbey);
    await repo.adicionar(bia.id, abbey);
    await repo.remover(ana.id, abbey.chave);
    expect(await repo.listar(ana.id)).toEqual([]);
    expect(await repo.listar(bia.id)).toHaveLength(1);
  });
});
