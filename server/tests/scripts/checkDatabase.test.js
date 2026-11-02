import { describe, it, expect } from 'vitest';
import { checkBeforeMigrate } from '../../../scripts/check-db-before-migrate.js';

describe('checkBeforeMigrate', () => {
  it('libera banco vazio (primeiro deploy)', () => {
    expect(checkBeforeMigrate([])).toEqual({ ok: true });
  });

  it('libera banco já controlado pelo Prisma (tem _prisma_migrations)', () => {
    expect(checkBeforeMigrate(['_prisma_migrations', 'usuarios', 'posts'])).toEqual({ ok: true });
  });

  it('bloqueia banco com tabelas que o Prisma não criou, listando quais são', () => {
    const result = checkBeforeMigrate(['usuario', 'post', 'comentarios']);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/usuario, post, comentarios/);
    expect(result.message).toMatch(/não foi criado pelo Prisma/);
  });
});
