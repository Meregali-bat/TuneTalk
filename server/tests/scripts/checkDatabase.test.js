import { describe, it, expect } from 'vitest';
import { checkBeforeMigrate, checkPreviewDatabase } from '../../../scripts/check-db-before-migrate.js';

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

describe('checkPreviewDatabase (site de teste)', () => {
  it('produção e máquina local seguem normais', () => {
    expect(checkPreviewDatabase({ VERCEL_ENV: 'production' })).toEqual({ ok: true });
    expect(checkPreviewDatabase({})).toEqual({ ok: true });
  });

  it('teste só passa com o banco de teste marcado', () => {
    expect(checkPreviewDatabase({ VERCEL_ENV: 'preview', BANCO_DE_TESTE: 'sim' })).toEqual({ ok: true });
    const semBanco = checkPreviewDatabase({ VERCEL_ENV: 'preview' });
    expect(semBanco.ok).toBe(false);
    expect(semBanco.message).toMatch(/BANCO_DE_TESTE=sim/);
  });

  it('aceita "Sim" com espaços e explica no log o ramo e o que chegou', () => {
    expect(checkPreviewDatabase({ VERCEL_ENV: 'preview', BANCO_DE_TESTE: ' Sim ' })).toEqual({ ok: true });
    expect(checkPreviewDatabase({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'teste' }).message)
      .toMatch(/Ramo deste deploy: teste\. BANCO_DE_TESTE não chegou neste deploy/);
    expect(checkPreviewDatabase({ VERCEL_ENV: 'preview', BANCO_DE_TESTE: 'true' }).message).toMatch(/chegou com outro valor \("true"\)/);
  });
});
