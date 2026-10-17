import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { PrismaPGlite } from 'pglite-prisma-adapter';
import { PrismaClient } from '../../src/generated/prisma/client.ts';

const migrationsDir = path.resolve(import.meta.dirname, '../../../prisma/migrations');

const TABLES = ['notificacoes', 'curtidas', 'seguimentos', 'posts', 'usuarios'];

/**
 * Postgres em memória (PGlite) com as migrations reais aplicadas.
 * Permite testar os repositórios contra SQL de verdade sem depender de um servidor.
 */
export async function createTestDatabase() {
  const pglite = new PGlite();
  const migrations = fs.readdirSync(migrationsDir).filter((name) => !name.endsWith('.toml')).sort();
  for (const name of migrations) {
    await pglite.exec(fs.readFileSync(path.join(migrationsDir, name, 'migration.sql'), 'utf8'));
  }

  const prisma = new PrismaClient({ adapter: new PrismaPGlite(pglite) });

  return {
    prisma,
    async reset() {
      await pglite.exec(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);
    },
    async close() {
      await prisma.$disconnect();
      await pglite.close();
    },
  };
}

// Fábricas de dados para deixar os testes curtos e legíveis.
export function seed(prisma) {
  let counter = 0;
  return {
    user: (data = {}) => {
      counter += 1;
      return prisma.usuario.create({
        data: { nome: `user${counter}`, email: `user${counter}@x.com`, senha: 'hash', fotoPerfil: `u${counter}.png`, ...data },
      });
    },
    post: (autorId, data = {}) =>
      prisma.post.create({
        data: { autorId, texto: 'texto', musicName: 'Help!', artistName: 'The Beatles', postType: 'música', nota: 8, ...data },
      }),
    reply: (parentId, autorId, data = {}) =>
      prisma.post.create({ data: { parentId, autorId, texto: 'resposta', ...data } }),
  };
}
