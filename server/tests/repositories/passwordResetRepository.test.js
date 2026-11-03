import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestDatabase, seed } from '../helpers/testDatabase.js';
import { createPasswordResetRepository } from '../../src/repositories/passwordResetRepository.js';

describe('passwordResetRepository (Postgres)', () => {
  let db;
  let repo;
  let ana;
  const agora = new Date('2026-11-03T12:00:00Z');
  const daqui = (min) => new Date(agora.getTime() + min * 60_000);

  beforeAll(async () => {
    db = await createTestDatabase();
    repo = createPasswordResetRepository(db.prisma);
  });
  beforeEach(async () => {
    await db.reset();
    ana = await seed(db.prisma).user();
  });
  afterAll(() => db.close());

  it('findValid só acha pedido não usado e dentro do prazo', async () => {
    await repo.create({ usuarioId: ana.id, tokenHash: 'a'.repeat(64), expiraEm: daqui(60) });
    await repo.create({ usuarioId: ana.id, tokenHash: 'b'.repeat(64), expiraEm: daqui(-1) });

    expect(await repo.findValid('a'.repeat(64), agora)).toEqual({ id: expect.any(Number), usuarioId: ana.id });
    expect(await repo.findValid('b'.repeat(64), agora)).toBeNull();
    expect(await repo.findValid('c'.repeat(64), agora)).toBeNull();
  });

  it('claim marca como usado uma única vez (o segundo uso do mesmo link falha)', async () => {
    await repo.create({ usuarioId: ana.id, tokenHash: 'a'.repeat(64), expiraEm: daqui(60) });
    const { id } = await repo.findValid('a'.repeat(64), agora);

    expect(await repo.claim(id, agora)).toBe(true);
    expect(await repo.claim(id, agora)).toBe(false);
    expect(await repo.findValid('a'.repeat(64), agora)).toBeNull();
  });

  it('countSince conta os pedidos recentes da pessoa; deleteForUser apaga todos', async () => {
    const criar = (hash, createdAt) => db.prisma.redefinicaoSenha.create({
      data: { usuarioId: ana.id, tokenHash: hash.repeat(64), expiraEm: daqui(60), createdAt },
    });
    await criar('a', daqui(-90));
    await criar('b', daqui(-30));
    await criar('c', daqui(-5));

    expect(await repo.countSince(ana.id, daqui(-60))).toBe(2);
    await repo.deleteForUser(ana.id);
    expect(await repo.countSince(ana.id, daqui(-1000))).toBe(0);
  });
});
