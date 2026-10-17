import { describe, it, expect } from 'vitest';
import { checkUsername, USERNAME_RULES } from '../../../shared/usernameRules.js';

describe('usernameRules', () => {
  it('aceita 3 a 30 letras, números, ponto e underline', () => {
    expect(checkUsername('ana')).toEqual({ length: true, characters: true });
    expect(checkUsername('ana.souza_99')).toEqual({ length: true, characters: true });
  });

  it('aponta cada regra quebrada', () => {
    expect(checkUsername('an')).toEqual({ length: false, characters: true });
    expect(checkUsername('ana souza')).toEqual({ length: true, characters: false });
    expect(checkUsername('ação')).toEqual({ length: true, characters: false });
    expect(checkUsername('a'.repeat(31))).toEqual({ length: false, characters: true });
    expect(checkUsername('')).toEqual({ length: false, characters: false });
  });

  it('descreve as regras para a interface', () => {
    expect(USERNAME_RULES).toEqual([
      ['length', 'De 3 a 30 caracteres'],
      ['characters', 'Só letras sem acento, números, ponto e underline'],
    ]);
  });
});
