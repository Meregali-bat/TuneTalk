// Padrão de commits e branches do projeto.
//   Commit: ":emoji: tipo: descrição"  ex.: ":bug: fix: ajuste no like"
//   Branch: "tipo/nome-curto"          ex.: "feat/repostar"
//
// Usado pelos hooks em .githooks/ e pelo workflow .github/workflows/ci.yml.
//   node scripts/padrao-git.js commit <arquivo-da-mensagem>
//   node scripts/padrao-git.js branch [nome]          (sem nome: branch atual)
//   node scripts/padrao-git.js intervalo <base> <head> (todos os commits entre os dois)
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const TIPOS = ['feat', 'fix', 'refactor', 'style', 'test', 'docs', 'chore'];

// Branches que não seguem tipo/nome: a principal e as que o Claude cria sozinho
// (claude/...), que não podem ser renomeadas por ele.
const BRANCHES_LIVRES = [/^main$/, /^claude\/.+/];

// Mensagens que o próprio git gera.
const COMMITS_LIVRES = [/^Merge /, /^Revert "/, /^(fixup|squash|amend)! /];

const COMMIT = new RegExp(`^:[a-z0-9_+-]+: (${TIPOS.join('|')}): \\S.*$`);
const BRANCH = new RegExp(`^(${TIPOS.join('|')})/[a-z0-9]+(-[a-z0-9]+)*$`);

const EXEMPLO_COMMIT = ':bug: fix: ajuste no like';
const EXEMPLO_BRANCH = 'feat/repostar';

function primeiraLinha(mensagem) {
  // Ignora comentários que o git coloca no editor.
  return (
    mensagem
      .split('\n')
      .filter((linha) => !linha.startsWith('#'))
      .find((linha) => linha.trim() !== '') ?? ''
  ).trimEnd();
}

export function validarCommit(mensagem) {
  const titulo = primeiraLinha(mensagem);
  if (COMMITS_LIVRES.some((re) => re.test(titulo))) return { ok: true };
  if (COMMIT.test(titulo)) return { ok: true };
  return {
    ok: false,
    erro:
      `Commit fora do padrão: "${titulo}"\n` +
      `  Use ":emoji: tipo: descrição", ex.: "${EXEMPLO_COMMIT}"\n` +
      `  Tipos: ${TIPOS.join(', ')}`,
  };
}

export function validarBranch(nome) {
  if (BRANCHES_LIVRES.some((re) => re.test(nome))) return { ok: true };
  if (BRANCH.test(nome)) return { ok: true };
  return {
    ok: false,
    erro:
      `Branch fora do padrão: "${nome}"\n` +
      `  Use "tipo/nome-curto" (minúsculas, hífen), ex.: "${EXEMPLO_BRANCH}"\n` +
      `  Tipos: ${TIPOS.join(', ')}\n` +
      `  Para renomear: git branch -m ${sugerirBranch(nome)}`,
  };
}

function sugerirBranch(nome) {
  const curto = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `feat/${curto || 'nome-curto'}`;
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function falhar(erros) {
  console.error(`\n${erros.join('\n\n')}\n`);
  process.exit(1);
}

function main([comando, ...args]) {
  if (comando === 'commit') {
    const r = validarCommit(readFileSync(args[0], 'utf8'));
    if (!r.ok) falhar([r.erro]);
    return;
  }

  if (comando === 'branch') {
    const nome = args[0] || git('rev-parse', '--abbrev-ref', 'HEAD');
    // HEAD solto (rebase, checkout de commit): não há branch para validar.
    if (nome === 'HEAD') return;
    const r = validarBranch(nome);
    if (!r.ok) falhar([r.erro]);
    return;
  }

  if (comando === 'intervalo') {
    const [base, head] = args;
    const saida = git('log', '--format=%H%x00%B%x1e', `${base}..${head}`);
    const erros = saida
      .split('\x1e')
      .map((bloco) => bloco.trim())
      .filter(Boolean)
      .map((bloco) => {
        const [hash, mensagem] = bloco.split('\x00');
        const r = validarCommit(mensagem);
        return r.ok ? null : `${hash.slice(0, 7)} ${r.erro}`;
      })
      .filter(Boolean);
    if (erros.length) falhar(erros);
    return;
  }

  console.error('Uso: node scripts/padrao-git.js commit <arquivo> | branch [nome] | intervalo <base> <head>');
  process.exit(2);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
