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
    const { linhas, notas } = montarPauta(390, 844);
    expect(linhas.map((l) => l.linha)).toEqual([0, 1, 2, 3, 4]);
    expect(linhas[0].larguraInicio).toBeGreaterThan(linhas[0].larguraFim * 5);
    expect(notas[0].escala).toBeGreaterThan(notas.at(-1).escala * 3);
  });

  it('cada linha segue uma curva lisa: trechos retos curtos demais para virar quina', () => {
    const { linhas } = montarPauta(1920, 900);
    for (const { caminho } of linhas) {
      const pontos = caminho.slice(1).split('L').map((p) => p.split(' ').map(Number));
      const maior = Math.max(...pontos.slice(1).map(([x, y], i) => Math.hypot(x - pontos[i][0], y - pontos[i][1])));
      expect(maior).toBeLessThan(24);
    }
  });

  it('as notas entram na ordem em que a pauta passa por elas', () => {
    const { notas } = montarPauta(390, 844);
    const chegadas = notas.map((n) => n.chegada);
    expect(chegadas).toEqual([...chegadas].sort((x, y) => x - y));
    expect(chegadas[0]).toBeGreaterThanOrEqual(0);
    expect(chegadas.at(-1)).toBeLessThan(1);
  });

  it('as cinco linhas só acabam fora da tela, cortadas pela borda de cima', () => {
    for (const [w, h] of [[390, 844], [1600, 680], [1920, 900]]) {
      const { linhas } = montarPauta(w, h);
      for (const { fim } of linhas) expect(fim[1]).toBeLessThan(0);
    }
  });

  it('desenha com as cores da paleta, se desenha aos poucos e some da página no fim', () => {
    vi.useFakeTimers();
    const { getByTestId, queryByTestId } = render(<ProfileEffect efeito={{ tipo: 'notas', paleta: 'sol' }} />);
    const camada = getByTestId('petalas');
    expect(camada).toHaveAttribute('data-tipo', 'notas');
    const linhas = camada.querySelectorAll('.staff-sweep__linha');
    expect(linhas.length).toBe(5);
    expect(linhas[0].getAttribute('fill')).toBe('#ffb347');
    // Cada linha se revela pela própria máscara, que se desenha ao longo do caminho.
    const mascara = camada.querySelector(linhas[0].getAttribute('mask').slice(4, -1).replace(/:/g, '\\:'));
    expect(parseFloat(mascara.querySelector('.staff-sweep__revela').style.getPropertyValue('--comprimento'))).toBeGreaterThan(100);
    expect(camada.querySelectorAll('.staff-sweep__nota').length).toBe(8);

    act(() => vi.advanceTimersByTime(6000));
    expect(queryByTestId('petalas')).toBeNull();
  });
});
