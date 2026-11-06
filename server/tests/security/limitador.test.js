import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { createLimitador, createMemoryStore, createPostgresStore } from '../../src/security/limitador.js';
import { createTestDatabase } from '../helpers/testDatabase.js';

// Roda o middleware como o Express rodaria e devolve o erro passado para next (ou undefined).
async function rodar(middleware, req = { ip: '1.2.3.4' }) {
  const headers = {};
  const res = { set: (k, v) => { headers[k] = v; } };
  let erro;
  await middleware(req, res, (e) => { erro = e; });
  return { erro, headers };
}

describe('limitador (memória)', () => {
  it('deixa passar até o máximo e responde 429 com Retry-After depois', async () => {
    let agora = 1_000_000;
    const limitador = createLimitador({ store: createMemoryStore({ now: () => agora }), now: () => agora });
    const mw = limitador.middleware('login', { max: 2, janelaSeg: 60, chave: (req) => req.ip });

    expect((await rodar(mw)).erro).toBeUndefined();
    expect((await rodar(mw)).erro).toBeUndefined();
    const { erro, headers } = await rodar(mw);
    expect(erro).toMatchObject({ status: 429 });
    expect(headers['Retry-After']).toBe('60');

    // Outro ip tem a própria conta.
    expect((await rodar(mw, { ip: '5.6.7.8' })).erro).toBeUndefined();

    // Janela virou: libera de novo.
    agora += 61_000;
    expect((await rodar(mw)).erro).toBeUndefined();
  });

  it('chave nula não limita (ex.: sem usuário na sessão)', async () => {
    const limitador = createLimitador({ store: createMemoryStore() });
    const mw = limitador.middleware('x', { max: 0, janelaSeg: 60, chave: () => null });
    expect((await rodar(mw)).erro).toBeUndefined();
  });

  it('se o banco dos contadores falhar, deixa passar e registra', async () => {
    const log = vi.fn();
    const limitador = createLimitador({ store: { incrementar: vi.fn().mockRejectedValue(new Error('fora')) }, log });
    const mw = limitador.middleware('x', { max: 0, janelaSeg: 60, chave: (req) => req.ip });
    expect((await rodar(mw)).erro).toBeUndefined();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('fora'));
  });

  it('primeiraVez só é true na primeira vez dentro da janela', async () => {
    const limitador = createLimitador({ store: createMemoryStore() });
    expect(await limitador.primeiraVez('like:1:2', 60)).toBe(true);
    expect(await limitador.primeiraVez('like:1:2', 60)).toBe(false);
    expect(await limitador.primeiraVez('like:1:3', 60)).toBe(true);
  });
});

describe('limitador (Postgres)', () => {
  let db;
  beforeAll(async () => { db = await createTestDatabase(); });
  afterAll(async () => { await db.close(); });

  it('conta no banco, de forma atômica, e recomeça quando a janela expira', async () => {
    const store = createPostgresStore(db, { random: () => 1 });
    expect((await store.incrementar('t:a', 60)).contagem).toBe(1);
    expect((await store.incrementar('t:a', 60)).contagem).toBe(2);
    const resultados = await Promise.all(Array.from({ length: 5 }, () => store.incrementar('t:a', 60)));
    expect(resultados.map((r) => r.contagem).sort((a, b) => a - b)).toEqual([3, 4, 5, 6, 7]);

    await db.query("UPDATE limites_requisicao SET expira_em = now() - interval '1 second' WHERE chave = 't:a'");
    const depois = await store.incrementar('t:a', 60);
    expect(depois.contagem).toBe(1);
    expect(depois.expiraEm).toBeGreaterThan(Date.now() + 50_000);
  });

  it('de vez em quando apaga as janelas vencidas', async () => {
    await db.query("INSERT INTO limites_requisicao VALUES ('velha', 3, now() - interval '1 hour')");
    const store = createPostgresStore(db, { random: () => 0 });
    await store.incrementar('t:b', 60);
    await new Promise((r) => setTimeout(r, 50));
    const { rows } = await db.query("SELECT chave FROM limites_requisicao WHERE chave = 'velha'");
    expect(rows).toEqual([]);
  });
});
