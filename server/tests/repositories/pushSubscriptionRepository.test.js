import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestDatabase, seed } from '../helpers/testDatabase.js';
import { createPushSubscriptionRepository } from '../../src/repositories/pushSubscriptionRepository.js';

describe('pushSubscriptionRepository (Postgres)', () => {
  let db;
  let repo;
  let factory;

  beforeAll(async () => {
    db = await createTestDatabase();
    repo = createPushSubscriptionRepository(db.prisma);
    factory = seed(db.prisma);
  });
  beforeEach(() => db.reset());
  afterAll(() => db.close());

  it('guarda, atualiza sem duplicar (mesmo aparelho) e apaga', async () => {
    const ana = await factory.user();
    const bia = await factory.user();
    await repo.save(ana.id, { endpoint: 'https://p/1', p256dh: 'a', auth: 'b' });
    await repo.save(ana.id, { endpoint: 'https://p/1', p256dh: 'c', auth: 'd' });
    expect(await repo.listByUser(ana.id)).toEqual([{ endpoint: 'https://p/1', p256dh: 'c', auth: 'd' }]);

    // O mesmo aparelho entrando com outra conta passa a ser dessa conta.
    await repo.save(bia.id, { endpoint: 'https://p/1', p256dh: 'c', auth: 'd' });
    expect(await repo.listByUser(ana.id)).toEqual([]);
    expect(await repo.listByUser(bia.id)).toHaveLength(1);

    await repo.remove(ana.id, 'https://p/1');
    expect(await repo.listByUser(bia.id)).toHaveLength(1);
    await repo.removeEndpoint('https://p/1');
    expect(await repo.listByUser(bia.id)).toEqual([]);
  });
});
