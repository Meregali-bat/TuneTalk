import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

// Um pool pequeno por instância: na Vercel cada função tem o seu, e o Neon multiplexa pelo pooler.
export function createPool(databaseUrl) {
  return new pg.Pool({ connectionString: databaseUrl, max: 5 });
}

export function createPrismaClient(pool) {
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}
