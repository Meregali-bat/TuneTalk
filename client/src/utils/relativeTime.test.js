import { describe, it, expect } from 'vitest';
import { relativeTime } from './relativeTime.js';

const now = new Date('2024-05-10T12:00:00Z');
const ago = (ms) => new Date(now.getTime() - ms).toISOString();
const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('relativeTime', () => {
  it.each([
    [10 * SEC, 'agora mesmo'],
    [5 * MIN, 'há 5 minutos'],
    [2 * HOUR, 'há 2 horas'],
    [26 * HOUR, 'ontem'],
    [3 * DAY, 'há 3 dias'],
    [15 * DAY, 'há 2 semanas'],
    [62 * DAY, 'há 2 meses'],
    [800 * DAY, 'há 2 anos'],
  ])('%i ms atrás → "%s"', (ms, esperado) => {
    expect(relativeTime(ago(ms), now)).toBe(esperado);
  });

  it('datas no futuro (relógio adiantado) contam como agora', () => {
    expect(relativeTime(ago(-5 * MIN), now)).toBe('agora mesmo');
  });
});
