import { describe, it, expect } from 'vitest';
import { formatDuration, releaseInfo, starIcons } from './postFormat.js';

describe('releaseInfo', () => {
  it('mostra duração em minutos quando o valor é numérico (segundos)', () => {
    expect(releaseInfo('138')).toBe('2 min');
    expect(releaseInfo(200)).toBe('3 min');
  });

  it('mostra o ano quando é uma data', () => {
    expect(releaseInfo('1969-09-26')).toBe('1969');
    expect(releaseInfo('1969-09-')).toBe('1969');
  });

  it('é vazio quando não há informação', () => {
    expect(releaseInfo(null)).toBe('');
    expect(releaseInfo('')).toBe('');
    expect(releaseInfo('abc')).toBe('');
  });
});

describe('starIcons', () => {
  it('converte a nota em 5 estrelas cheias, meias ou vazias', () => {
    expect(starIcons(0)).toEqual(['empty', 'empty', 'empty', 'empty', 'empty']);
    expect(starIcons(3)).toEqual(['fill', 'fill', 'fill', 'empty', 'empty']);
    expect(starIcons(2.5)).toEqual(['fill', 'fill', 'half', 'empty', 'empty']);
    expect(starIcons(5)).toEqual(['fill', 'fill', 'fill', 'fill', 'fill']);
  });
});

describe('formatDuration', () => {
  it('formata segundos como m:ss', () => {
    expect(formatDuration(138)).toBe('2:18');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3600)).toBe('60:00');
  });

  it('é vazio sem duração', () => {
    expect(formatDuration(null)).toBe('');
    expect(formatDuration(undefined)).toBe('');
  });
});
