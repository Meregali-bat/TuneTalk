import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestDatabase, seed } from '../helpers/testDatabase.js';
import { createFollowRepository } from '../../src/repositories/followRepository.js';

describe('followRepository (Postgres)', () => {
  let db;
  let repo;
  let ana;
  let bia;
  let caio;

  beforeAll(async () => {
    db = await createTestDatabase();
    repo = createFollowRepository(db.prisma);
  });
  beforeEach(async () => {
    await db.reset();
    const factory = seed(db.prisma);
    ana = await factory.user({ nome: 'Ana' });
    bia = await factory.user({ nome: 'Bia', bio: 'rock' });
    caio = await factory.user({ nome: 'Caio' });
  });
  afterAll(() => db.close());

  it('follow cria a relação e isFollowing a reconhece (em um só sentido)', async () => {
    expect(await repo.isFollowing(ana.id, bia.id)).toBe(false);
    await repo.follow(ana.id, bia.id);
    expect(await repo.isFollowing(ana.id, bia.id)).toBe(true);
    expect(await repo.isFollowing(bia.id, ana.id)).toBe(false);
  });

  it('unfollow desfaz a relação', async () => {
    await repo.follow(ana.id, bia.id);
    await repo.unfollow(ana.id, bia.id);
    expect(await repo.isFollowing(ana.id, bia.id)).toBe(false);
  });

  it('lista e conta quem o usuário segue e seus seguidores', async () => {
    await repo.follow(ana.id, bia.id);
    await repo.follow(ana.id, caio.id);
    await repo.follow(caio.id, bia.id);

    expect((await repo.followingIds(ana.id)).sort()).toEqual([bia.id, caio.id].sort());
    expect(await repo.countFollowing(ana.id)).toBe(2);
    expect(await repo.countFollowers(bia.id)).toBe(2);

    expect(await repo.listFollowing(caio.id)).toEqual([
      { id: bia.id, nome: 'Bia', fotoPerfil: bia.fotoPerfil, bio: 'rock' },
    ]);
    expect((await repo.listFollowers(bia.id)).map((u) => u.nome).sort()).toEqual(['Ana', 'Caio']);
  });

  it('listas vazias e contagens zeradas para quem não tem relações', async () => {
    expect(await repo.followingIds(ana.id)).toEqual([]);
    expect(await repo.listFollowers(ana.id)).toEqual([]);
    expect(await repo.countFollowers(ana.id)).toBe(0);
  });
});
