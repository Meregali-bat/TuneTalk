import { describe, it, expect } from 'vitest';
import { isValidNota, notaLabel, parseNota } from '../../../shared/rating.js';

describe('rating (nota de 0 a 10)', () => {
  it('converte o valor recebido sem aceitar texto vazio', () => {
    expect(parseNota('7')).toBe(7);
    expect(parseNota(null)).toBeNull();
    expect(parseNota(undefined)).toBeNull();
    expect(parseNota('  ')).toBeNaN();
  });

  it('só aceita inteiros de 0 a 10', () => {
    expect([0, 5, 10].every(isValidNota)).toBe(true);
    expect([-1, 11, 4.5, Number.NaN].some(isValidNota)).toBe(false);
  });

  it('descreve a nota em palavras', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(notaLabel)).toEqual([
      'Péssimo', 'Péssimo', 'Ruim', 'Ruim', 'Fraco', 'Ok', 'Bom', 'Bom', 'Muito bom', 'Excelente', 'Obra-prima',
    ]);
  });
});
