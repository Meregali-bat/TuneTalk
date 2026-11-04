import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestDatabase, seed } from '../helpers/testDatabase.js';
import { createRestricaoRepository } from '../../src/repositories/restricaoRepository.js';

describe('restricaoRepository (Postgres)', () => {
  let db;
  let repo;
  let ana;
  let bia;
  let caio;
  let factory;

  beforeAll(async () => {
    db = await createTestDatabase();
    repo = createRestricaoRepository(db.prisma);
  });
  beforeEach(async () => {
    await db.reset();
    factory = seed(db.prisma);
    ana = await factory.user({ nome: 'Ana' });
    bia = await factory.user({ nome: 'Bia' });
    caio = await factory.user({ nome: 'Caio' });
  });
  afterAll(() => db.close());

  it('bloquear desfaz o seguir nos dois sentidos e pode repetir sem erro', async () => {
    await db.prisma.seguimento.createMany({ data: [
      { seguidorId: ana.id, seguidoId: bia.id }, { seguidorId: bia.id, seguidoId: ana.id }, { seguidorId: ana.id, seguidoId: caio.id },
    ] });
    await repo.bloquear(ana.id, bia.id);
    await repo.bloquear(ana.id, bia.id);

    const seguindo = await db.prisma.seguimento.findMany({ select: { seguidorId: true, seguidoId: true } });
    expect(seguindo).toEqual([{ seguidorId: ana.id, seguidoId: caio.id }]);
    expect(await repo.relacao(ana.id, bia.id)).toEqual({ bloqueado: true, meBloqueou: false, silenciado: false });
    expect(await repo.relacao(bia.id, ana.id)).toEqual({ bloqueado: false, meBloqueou: true, silenciado: false });

    await repo.desbloquear(ana.id, bia.id);
    expect(await repo.relacao(ana.id, bia.id)).toEqual({ bloqueado: false, meBloqueou: false, silenciado: false });
  });

  it('silenciar e dessilenciar', async () => {
    await repo.silenciar(ana.id, bia.id);
    await repo.silenciar(ana.id, bia.id);
    expect(await repo.relacao(ana.id, bia.id)).toEqual({ bloqueado: false, meBloqueou: false, silenciado: true });
    // Quem foi silenciado não fica sabendo.
    expect(await repo.relacao(bia.id, ana.id)).toEqual({ bloqueado: false, meBloqueou: false, silenciado: false });
    await repo.dessilenciar(ana.id, bia.id);
    expect((await repo.relacao(ana.id, bia.id)).silenciado).toBe(false);
  });

  it('ocultosPara junta quem a pessoa silenciou, bloqueou e quem a bloqueou', async () => {
    const dani = await factory.user({ nome: 'Dani' });
    await repo.silenciar(ana.id, bia.id);
    await repo.bloquear(ana.id, caio.id);
    await repo.bloquear(dani.id, ana.id);
    expect((await repo.ocultosPara(ana.id)).sort()).toEqual([bia.id, caio.id, dani.id].sort());
    // Silenciar é só de quem silenciou; bloquear vale para os dois.
    expect(await repo.ocultosPara(bia.id)).toEqual([]);
    expect(await repo.ocultosPara(caio.id)).toEqual([ana.id]);
  });

  it('listar traz quem a pessoa bloqueou e silenciou', async () => {
    await repo.bloquear(ana.id, bia.id);
    await repo.silenciar(ana.id, caio.id);
    const { bloqueados, silenciados } = await repo.listar(ana.id);
    expect(bloqueados.map((u) => u.nome)).toEqual(['Bia']);
    expect(silenciados.map((u) => u.nome)).toEqual(['Caio']);
  });
});
