import { describe, it, expect } from 'vitest';
import md5 from 'md5';
import { createPasswords } from '../../src/security/passwords.js';

const passwords = createPasswords({ rounds: 4 });

describe('passwords', () => {
  it('gera hash bcrypt (nunca a senha em texto) e confere', async () => {
    const hash = await passwords.hash('Senha!1');
    expect(hash).toMatch(/^\$2[aby]\$04\$/);
    expect(await passwords.verify('Senha!1', hash)).toEqual({ ok: true, needsRehash: false });
    expect(await passwords.verify('errada', hash)).toEqual({ ok: false, needsRehash: false });
  });

  it('aceita as senhas antigas em md5 e pede para regravar em bcrypt', async () => {
    expect(await passwords.verify('Senha!1', md5('Senha!1'))).toEqual({ ok: true, needsRehash: true });
    expect(await passwords.verify('errada', md5('Senha!1'))).toEqual({ ok: false, needsRehash: false });
  });

  it('recusa hash vazio ou desconhecido', async () => {
    expect(await passwords.verify('x', null)).toEqual({ ok: false, needsRehash: false });
    expect(await passwords.verify('x', 'texto-puro')).toEqual({ ok: false, needsRehash: false });
  });
});
