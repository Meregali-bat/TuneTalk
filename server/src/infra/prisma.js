import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';

export function createPrismaClient(databaseUrl) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}
