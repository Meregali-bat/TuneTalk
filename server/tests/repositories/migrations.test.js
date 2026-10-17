import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

const migrationsDir = path.resolve(import.meta.dirname, '../../../prisma/migrations');
const migrations = fs.readdirSync(migrationsDir).filter((name) => !name.endsWith('.toml')).sort();
const sql = (name) => fs.readFileSync(path.join(migrationsDir, name, 'migration.sql'), 'utf8');

describe('migration comentarios_viram_posts', () => {
  it('transforma cada comentário em resposta sem nota, ligada ao post comentado', async () => {
    const db = new PGlite();
    const alvo = migrations.findIndex((name) => name.endsWith('_comentarios_viram_posts'));
    for (const name of migrations.slice(0, alvo)) await db.exec(sql(name));

    await db.exec(`
      INSERT INTO usuarios (nome, email, senha) VALUES ('ana', 'a@x.com', 'h'), ('bia', 'b@x.com', 'h');
      INSERT INTO posts (texto, music_name, nota, autor_id) VALUES ('que som', 'Help!', 8, 1);
      INSERT INTO comentarios (texto, post_id, autor_id, created_at) VALUES
        ('primeiro', 1, 2, '2024-01-01T10:00:00Z'), ('segundo', 1, 1, '2024-01-01T11:00:00Z');
    `);
    await db.exec(sql(migrations[alvo]));

    const { rows } = await db.query('SELECT id, texto, nota, autor_id, parent_id FROM posts ORDER BY id');
    expect(rows).toEqual([
      { id: 1, texto: 'que som', nota: 8, autor_id: 1, parent_id: null },
      { id: 2, texto: 'primeiro', nota: null, autor_id: 2, parent_id: 1 },
      { id: 3, texto: 'segundo', nota: null, autor_id: 1, parent_id: 1 },
    ]);
    const { rows: tabelas } = await db.query("SELECT to_regclass('comentarios') AS t");
    expect(tabelas[0].t).toBeNull();
    await db.close();
  });
});
