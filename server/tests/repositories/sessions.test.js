import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestDatabase } from '../helpers/testDatabase.js';
import { createSessionCleaner } from '../../src/infra/sessionStore.js';

describe('createSessionCleaner (Postgres)', () => {
  let db;

  beforeAll(async () => { db = await createTestDatabase(); });
  beforeEach(async () => {
    await db.exec('TRUNCATE session');
    const amanha = new Date(Date.now() + 86_400_000).toISOString();
    await db.query(
      `INSERT INTO session (sid, sess, expire) VALUES
        ('celular', $1, $4), ('notebook', $1, $4), ('outra-pessoa', $2, $4), ('anonima', $3, $4)`,
      [JSON.stringify({ user: { id: 1 } }), JSON.stringify({ user: { id: 2 } }), JSON.stringify({ cookie: {} }), amanha],
    );
  });
  afterAll(() => db.close());

  it('destroyOthers apaga as outras sessões do usuário e mantém a atual e as de outras pessoas', async () => {
    await createSessionCleaner(db).destroyOthers(1, 'celular');

    const { rows } = await db.query('SELECT sid FROM session ORDER BY sid');
    expect(rows.map((r) => r.sid)).toEqual(['anonima', 'celular', 'outra-pessoa']);
  });

  it('destroyAll apaga todas as sessões do usuário (após redefinir a senha pelo email)', async () => {
    await createSessionCleaner(db).destroyAll(1);

    const { rows } = await db.query('SELECT sid FROM session ORDER BY sid');
    expect(rows.map((r) => r.sid)).toEqual(['anonima', 'outra-pessoa']);
  });
});
