import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { PetalRain, makePetals } from './PetalRain.jsx';
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

  it('notas: caem pedaços de pauta (5 linhas nas cores da paleta) com notas, e menos de cada vez', () => {
    const { getByTestId } = render(<PetalRain tipo="notas" colors={['#111111', '#222222']} />);
    const pautas = getByTestId('petalas').querySelectorAll('svg.pauta');
    expect(pautas).toHaveLength(9);
    const linhas = [...pautas[0].querySelectorAll('path')].slice(0, 5);
    expect(linhas.map((l) => l.getAttribute('stroke'))).toEqual(['#111111', '#222222', '#111111', '#222222', '#111111']);
    expect(pautas[0].querySelectorAll('ellipse').length).toBeGreaterThan(0);
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
