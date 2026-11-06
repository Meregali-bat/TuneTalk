// Aponta o git para os hooks versionados em .githooks/ (roda no "npm install").
// Fora de um repositório git (Vercel, Docker) não faz nada.
import { execFileSync } from 'node:child_process';

try {
  execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { stdio: 'ignore' });
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' });
} catch {
  // sem git aqui: nada a instalar
}
