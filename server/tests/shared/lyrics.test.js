import { describe, it, expect } from 'vitest';
import { alternarVerso, validarTrecho, versosDaLetra, VERSO_MAX } from '../../../shared/lyrics.js';

describe('versosDaLetra', () => {
  it('quebra em versos, sem linhas vazias nem marcações de seção', () => {
    expect(versosDaLetra('[Verso 1]\r\nUm  dois\n\n três \n[Refrão]\nquatro')).toEqual(['Um dois', 'três', 'quatro']);
  });
  it('tolera entrada que não é texto e limita o tamanho', () => {
    expect(versosDaLetra(null)).toEqual([]);
    expect(versosDaLetra({})).toEqual([]);
    expect(versosDaLetra('a'.repeat(300))[0]).toHaveLength(VERSO_MAX);
    expect(versosDaLetra('a\nb\nc', 2)).toEqual(['a', 'b']);
  });
});

describe('validarTrecho', () => {
  it('aceita até 4 versos e limpa os espaços', () => {
    expect(validarTrecho([' um ', 'dois\nmeio'])).toEqual({ versos: ['um', 'dois meio'] });
  });
  it('sem trecho é null', () => {
    expect(validarTrecho(undefined)).toEqual({ versos: null });
    expect(validarTrecho(null)).toEqual({ versos: null });
    expect(validarTrecho([])).toEqual({ versos: null });
  });
  it('recusa formato errado, versos demais, vazios ou longos', () => {
    expect(validarTrecho('texto').erro).toBe('Trecho da letra inválido.');
    expect(validarTrecho([1]).erro).toBe('Trecho da letra inválido.');
    expect(validarTrecho(['a', 'b', 'c', 'd', 'e']).erro).toBe('Escolha no máximo 4 versos da letra.');
    expect(validarTrecho(['a', '  ']).erro).toBe('Trecho da letra inválido.');
    expect(validarTrecho(['a'.repeat(VERSO_MAX + 1)]).erro).toBe('Trecho da letra inválido.');
  });
});

describe('alternarVerso (versos seguidos)', () => {
  it('começa, cresce pelos lados e encolhe pelas pontas', () => {
    let s = alternarVerso(null, 3).selecao;
    expect(s).toEqual({ inicio: 3, fim: 3 });
    s = alternarVerso(s, 4).selecao;
    s = alternarVerso(s, 2).selecao;
    expect(s).toEqual({ inicio: 2, fim: 4 });
    s = alternarVerso(s, 2).selecao;
    expect(s).toEqual({ inicio: 3, fim: 4 });
    s = alternarVerso(s, 4).selecao;
    expect(alternarVerso(s, 3).selecao).toBeNull();
  });
  it('tocar longe ou no meio recomeça; no limite de 4 não cresce', () => {
    expect(alternarVerso({ inicio: 2, fim: 4 }, 8).selecao).toEqual({ inicio: 8, fim: 8 });
    expect(alternarVerso({ inicio: 2, fim: 4 }, 3).selecao).toEqual({ inicio: 3, fim: 3 });
    expect(alternarVerso({ inicio: 2, fim: 5 }, 6)).toEqual({ selecao: { inicio: 2, fim: 5 }, limite: true });
  });
});
