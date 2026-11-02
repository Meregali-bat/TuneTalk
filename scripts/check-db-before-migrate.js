#!/usr/bin/env node
// Trava de segurança do deploy: só deixa o `prisma migrate deploy` rodar num banco vazio ou
// num banco que já é controlado pelo Prisma. Um banco com dados de outra origem (ex.: as tabelas
// do sistema antigo) precisa ser convertido antes, senão as migrations falham no meio do caminho.
import 'dotenv/config';
import pg from 'pg';
import { fileURLToPath } from 'node:url';

export function checkBeforeMigrate(tables) {
  if (tables.length === 0 || tables.includes('_prisma_migrations')) return { ok: true };
  return {
    ok: false,
    message:
      `O banco tem tabelas, mas não foi criado pelo Prisma: ${tables.join(', ')}.\n`
      + 'As migrations não foram aplicadas para não misturar os dados. Converta os dados antigos primeiro.',
  };
}

async function listTables(connectionString) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const { rows } = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    return rows.map((row) => row.table_name);
  } finally {
    await client.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) {
    console.error('Defina DATABASE_URL (e, no Neon, DATABASE_URL_UNPOOLED).');
    process.exit(1);
  }
  const result = checkBeforeMigrate(await listTables(url));
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }
}
