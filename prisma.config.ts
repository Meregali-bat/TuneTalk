import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  // Migrations usam a conexão direta do Neon (o pooler não segura os locks do Prisma Migrate).
  // A integração Neon da Vercel cria DATABASE_URL (com pooler) e DATABASE_URL_UNPOOLED (direta).
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || '',
  },
});
