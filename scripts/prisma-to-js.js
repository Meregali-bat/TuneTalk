#!/usr/bin/env node
// O gerador "prisma-client" do Prisma 7 só gera TypeScript. Node 22 roda .ts direto, mas a Vercel
// compila as funções e deixa os imports apontando para arquivos .ts que deixam de existir.
// Este passo (rodado depois de `prisma generate`) converte o client gerado para .js comum,
// usando o próprio Node para remover os tipos, para que todo ambiente rode os mesmos arquivos.
import fs from 'node:fs';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';

const GENERATED_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../server/src/generated/prisma');

export function toJavaScript(source) {
  return stripTypeScriptTypes(source, { mode: 'strip' })
    .replace(/(["'])(\.{1,2}\/[^"'\n]+)\.ts\1/g, '$1$2.js$1');
}

function convertDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      convertDir(file);
    } else if (entry.name.endsWith('.ts')) {
      fs.writeFileSync(file.replace(/\.ts$/, '.js'), toJavaScript(fs.readFileSync(file, 'utf8')));
      fs.rmSync(file);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--clean')) {
    // O Prisma se recusa a gerar numa pasta que não reconhece; apaga a versão convertida antes.
    fs.rmSync(GENERATED_DIR, { recursive: true, force: true });
  } else {
    convertDir(GENERATED_DIR);
    console.log('Prisma Client convertido para JavaScript.');
  }
}
