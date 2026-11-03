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
