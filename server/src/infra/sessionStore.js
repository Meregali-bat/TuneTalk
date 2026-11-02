import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';

const PgStore = connectPgSimple(session);

// Sessões na tabela "session" (criada pela migration 20261102000000_sessoes), usando o mesmo pool do Prisma.
export function createSessionStore(pool) {
  return new PgStore({ pool, tableName: 'session', createTableIfMissing: false });
}
