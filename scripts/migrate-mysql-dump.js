#!/usr/bin/env node
// Migra os dados de um dump do MySQL antigo (ex.: banco.sql) para o Postgres em DATABASE_URL.
//
//   npm run db:import -- banco.sql --dry-run   # só mostra o relatório
//   npm run db:import -- banco.sql             # grava no banco (que precisa estar vazio)
import 'dotenv/config';
import fs from 'node:fs';
import { parseDump } from '../server/src/migration/mysqlDump.js';
import { transformLegacyData } from '../server/src/migration/transform.js';
import { loadIntoDatabase } from '../server/src/migration/load.js';
import { createPrismaClient } from '../server/src/infra/prisma.js';

const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith('--'));
const dryRun = args.includes('--dry-run');

if (!file) {
  console.error('Uso: npm run db:import -- <arquivo.sql> [--dry-run]');
  process.exit(1);
}

const { data, report } = transformLegacyData(parseDump(fs.readFileSync(file, 'utf8')));

console.log('Registros a importar:');
console.table(report.imported);
if (report.adjusted.length > 0) {
  console.log(`\n${report.adjusted.length} registro(s) ajustado(s):`);
  console.table(report.adjusted);
}
if (report.skipped.length > 0) {
  console.log(`\n${report.skipped.length} registro(s) descartado(s):`);
  console.table(report.skipped);
}

if (dryRun) {
  console.log('\n--dry-run: nada foi gravado.');
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error('Defina DATABASE_URL para gravar os dados.');
  process.exit(1);
}

const prisma = createPrismaClient(process.env.DATABASE_URL);
try {
  await loadIntoDatabase(prisma, data);
  console.log('\nMigração concluída.');
} catch (error) {
  console.error(`\nFalha na migração: ${error.message}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
