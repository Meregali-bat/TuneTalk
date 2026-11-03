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

/**
 * Site de teste (deploy de Preview da Vercel): só roda com um banco de teste, marcado com
 * BANCO_DE_TESTE=sim nas variáveis do ambiente Preview. Sem isso, o teste poderia aplicar
 * migrations e gravar posts de teste no banco de verdade, que o público usa.
 */
export function checkPreviewDatabase(env) {
  if (env.VERCEL_ENV !== 'preview') return { ok: true };
  if ((env.BANCO_DE_TESTE ?? '').trim().toLowerCase() === 'sim') return { ok: true };
  const ramo = env.VERCEL_GIT_COMMIT_REF || '(desconhecido)';
  const marca = env.BANCO_DE_TESTE === undefined ? 'não chegou neste deploy' : `chegou com outro valor (${JSON.stringify(env.BANCO_DE_TESTE)})`;
  return {
    ok: false,
    message:
      'Deploy de teste (Preview) sem banco de teste: o build parou para não mexer no banco de produção.\n'
      + `Ramo deste deploy: ${ramo}. BANCO_DE_TESTE ${marca}.\n`
      + 'Na Vercel, em Settings → Environment Variables, só para "Preview": aponte DATABASE_URL e '
      + 'DATABASE_URL_UNPOOLED para um branch de teste do Neon e crie BANCO_DE_TESTE=sim.',
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
  const preview = checkPreviewDatabase(process.env);
  if (!preview.ok) {
    console.error(preview.message);
    process.exit(1);
  }
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
