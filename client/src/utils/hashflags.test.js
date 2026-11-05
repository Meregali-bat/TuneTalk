import { describe, it, expect } from 'vitest';
import { hashflag, temaDoTexto } from './hashflags.js';

describe('hashflags', () => {
  it('#xmas (e #natal) têm emoji e tema de Natal, sem diferenciar maiúsculas', () => {
    expect(hashflag('xmas')).toEqual({ emoji: '🎄', tema: 'natal' });
    expect(hashflag('XMAS')).toEqual({ emoji: '🎄', tema: 'natal' });
    expect(hashflag('natal')?.tema).toBe('natal');
    expect(hashflag('rock')).toBeNull();
  });

  it('o tema do post vem das hashtags do texto', () => {
    expect(temaDoTexto('natal no tunetalk vai salvar o ano #xmas')).toBe('natal');
    expect(temaDoTexto('#rock #Xmas')).toBe('natal');
    expect(temaDoTexto('sem hashtag de natal #rock')).toBeNull();
    expect(temaDoTexto('')).toBeNull();
    expect(temaDoTexto(null)).toBeNull();
  });
});
