import { describe, it, expect } from 'vitest';
import { validarCommit, validarBranch } from '../../../scripts/padrao-git.js';

describe('validarCommit', () => {
  it.each([
    ':bug: fix: ajuste no like',
    ':sparkles: feat: repostar posts',
    ':recycle: refactor: separa o serviço de feed',
    ':white_check_mark: test: cobre o marco de 100 posts',
    ':memo: docs: atualiza o README\n\nCorpo do commit livre.',
    '# comentário do editor\n:art: style: ajusta espaçamento',
  ])('aceita "%s"', (msg) => {
    expect(validarCommit(msg).ok).toBe(true);
  });

  it.each([
    'Merge pull request #3 from Meregali-bat/feat/x',
    "Merge branch 'main' into feat/x",
    'Revert ":bug: fix: ajuste no like"',
    'fixup! :bug: fix: ajuste no like',
  ])('libera mensagem gerada pelo git: "%s"', (msg) => {
    expect(validarCommit(msg).ok).toBe(true);
  });

  it.each([
    'Presente dos 100 posts vira um disco de vinil',
    'fix: sem emoji',
    ':bug: ajuste sem tipo',
    ':bug: fixed: tipo inexistente',
    ':bug: Fix: tipo em maiúscula',
    ':bug: fix:sem espaço',
    ':bug: fix: ',
    '🐛 fix: emoji unicode em vez de shortcode',
    ':bug: fix(feed): escopo não faz parte do padrão',
    '',
  ])('recusa "%s" explicando o padrão', (msg) => {
    const r = validarCommit(msg);
    expect(r.ok).toBe(false);
    expect(r.erro).toContain(':emoji: tipo: descrição');
  });
});

describe('validarBranch', () => {
  it.each(['feat/repostar', 'fix/like', 'chore/ci-padrao-git', 'docs/readme2'])('aceita "%s"', (nome) => {
    expect(validarBranch(nome).ok).toBe(true);
  });

  it.each(['main', 'claude/project-thread-v4oej1'])('libera "%s"', (nome) => {
    expect(validarBranch(nome).ok).toBe(true);
  });

  it.each(['natal', 'teste', 'feature/repostar', 'feat/Repostar', 'feat/repostar_posts', 'feat/', 'feat/a/b', 'fix/-like'])(
    'recusa "%s"',
    (nome) => {
      expect(validarBranch(nome).ok).toBe(false);
    },
  );

  it('no CI recusa claude/... mas continua liberando a main', () => {
    expect(validarBranch('claude/project-thread-v4oej1', { ci: true }).ok).toBe(false);
    expect(validarBranch('main', { ci: true }).ok).toBe(true);
    expect(validarBranch('feat/repostar', { ci: true }).ok).toBe(true);
  });

  it('sugere o comando para renomear', () => {
    expect(validarBranch('Natal Aviso').erro).toContain('git branch -m feat/natal-aviso');
  });
});
