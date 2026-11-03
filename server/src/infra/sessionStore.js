import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';

const PgStore = connectPgSimple(session);

// Sessões na tabela "session" (criada pela migration 20261102000000_sessoes), usando o mesmo pool do Prisma.
export function createSessionStore(pool) {
  return new PgStore({ pool, tableName: 'session', createTableIfMissing: false });
}

// Ao trocar a senha, os outros aparelhos logados na conta saem; a sessão atual continua.
export function createSessionCleaner(pool) {
  return {
    async destroyOthers(usuarioId, keepSid) {
      await pool.query(
        "DELETE FROM session WHERE (sess -> 'user' ->> 'id')::int = $1 AND sid <> $2",
        [usuarioId, keepSid],
      );
    },
  };
}
