import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { PetalRain, ProfileEffect, makePetals } from './PetalRain.jsx';
import { montarPauta } from './StaffSweep.jsx';
import { profileEffectFor } from './profileEffects.js';

describe('makePetals', () => {
  it('gera pétalas com posição, tamanho, tempo e cor dentro das faixas', () => {
    const petals = makePetals(30, () => 0.5);
    expect(petals).toHaveLength(30);
    for (const p of petals) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(100);
      expect(p.size).toBeGreaterThanOrEqual(10);
      expect(p.size).toBeLessThanOrEqual(22);
      expect(p.duration).toBeGreaterThanOrEqual(4.5);
      expect(p.delay).toBeLessThanOrEqual(2.5);
      expect(p.color).toMatch(/^#/);
    }
  });

  it('o tempo total é o da pétala que termina por último', () => {
    const petals = makePetals(5, () => 1);
    expect(Math.max(...petals.map((p) => p.delay + p.duration))).toBeCloseTo(2.5 + 7.5);
  });
});

describe('PetalRain', () => {
  afterEach(() => vi.useRealTimers());

  it('é decorativo: escondido de leitores de tela e não pega cliques', () => {
    const { getByTestId } = render(<PetalRain count={12} />);
    const camada = getByTestId('petalas');
    expect(camada).toHaveAttribute('aria-hidden', 'true');
    expect(camada).toHaveClass('petal-rain');
    expect(camada.querySelectorAll('.petal')).toHaveLength(12);
  });

  it('estrelas: cai o caractere na cor da paleta', () => {
    const { getByTestId } = render(<PetalRain count={3} tipo="estrelas" colors={['#123456']} />);
    const glifos = getByTestId('petalas').querySelectorAll('.petal__body--glifo');
    expect([...glifos].map((g) => g.textContent)).toEqual(['\u2605', '\u2605', '\u2605']);
    expect(glifos[0].style.getPropertyValue('--petal-color')).toBe('#123456');
  });


  it('CD holográfico: o disco leva as cores da paleta no arco-íris', () => {
    const { getByTestId } = render(<PetalRain count={2} tipo="cd" colors={['#abcdef']} />);
    const cd = getByTestId('petalas').querySelector('.cd-holo');
    expect(cd.style.getPropertyValue('--cd-arco')).toContain('#abcdef');
  });

  it('cai uma vez e some da página quando as pétalas terminam', () => {
    vi.useFakeTimers();
    const { queryByTestId } = render(<PetalRain count={8} random={() => 1} />);
    expect(queryByTestId('petalas')).not.toBeNull();

    act(() => vi.advanceTimersByTime(10_000 + 200));
    expect(queryByTestId('petalas')).toBeNull();
  });
});

describe('profileEffectFor', () => {
  it('a sweetener tem pétalas (sem diferenciar maiúsculas); os outros perfis, nada', () => {
    expect(profileEffectFor('sweetener')).toBe('petalas');
    expect(profileEffectFor('Sweetener')).toBe('petalas');
    expect(profileEffectFor('bia')).toBeNull();
    expect(profileEffectFor(null)).toBeNull();
  });
});

describe('notas: uma pauta só atravessando a tela', () => {
  afterEach(() => vi.useRealTimers());

  it('as cinco linhas afinam do começo ao fim, e as notas diminuem junto', () => {
    const { segmentos, notas } = montarPauta(390, 844);
    const linha0 = segmentos.filter((s) => s.linha === 0);
    expect(linha0[0].largura).toBeGreaterThan(linha0.at(-1).largura * 5);
    expect(new Set(segmentos.map((s) => s.linha))).toEqual(new Set([0, 1, 2, 3, 4]));
    expect(notas[0].escala).toBeGreaterThan(notas.at(-1).escala * 3);
  });

  it('as cinco linhas só acabam fora da tela, cortadas pela borda de cima', () => {
    for (const [w, h] of [[390, 844], [1600, 680], [1920, 900]]) {
      const { segmentos } = montarPauta(w, h);
      for (let linha = 0; linha < 5; linha += 1) {
        const fim = segmentos.filter((s) => s.linha === linha).at(-1);
        const y = Number(fim.d.split(' ').at(-1));
        expect(y).toBeLessThan(0);
      }
    }
  });

  it('desenha com as cores da paleta, se desenha aos poucos e some da página no fim', () => {
    vi.useFakeTimers();
    const { getByTestId, queryByTestId } = render(<ProfileEffect efeito={{ tipo: 'notas', paleta: 'sol' }} />);
    const camada = getByTestId('petalas');
    expect(camada).toHaveAttribute('data-tipo', 'notas');
    const linhas = camada.querySelectorAll('.staff-sweep__linha');
    expect(linhas[0].getAttribute('stroke')).toBe('#ffb347');
    expect(parseFloat(linhas[linhas.length - 1].style.animationDelay)).toBeGreaterThan(2);
    expect(camada.querySelectorAll('.staff-sweep__nota').length).toBe(8);

    act(() => vi.advanceTimersByTime(6000));
    expect(queryByTestId('petalas')).toBeNull();
  });
});
