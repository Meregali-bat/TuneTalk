import { describe, it, expect } from 'vitest';
import { checkPassword, isPasswordValid } from '../../../shared/passwordRules.js';

describe('passwordRules', () => {
  it('indica quais regras foram cumpridas', () => {
    expect(checkPassword('abc')).toEqual({ length: false, uppercase: false, symbol: false });
    expect(checkPassword('Abcdef')).toEqual({ length: true, uppercase: true, symbol: false });
    expect(checkPassword('abcde!')).toEqual({ length: true, uppercase: false, symbol: true });
  });

  it('só é válida com 6+ caracteres, maiúscula e símbolo', () => {
    expect(isPasswordValid('Abcde!')).toBe(true);
    expect(isPasswordValid('Abcd!')).toBe(false);
    expect(isPasswordValid('abcde!')).toBe(false);
    expect(isPasswordValid('Abcdef')).toBe(false);
    expect(isPasswordValid(undefined)).toBe(false);
  });
});
