import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PullToRefresh } from './PullToRefresh.jsx';

const puxar = (deY, ateY) => {
  fireEvent.touchStart(window, { touches: [{ clientY: deY }] });
  fireEvent.touchMove(window, { touches: [{ clientY: ateY }] });
  fireEvent.touchEnd(window, { touches: [] });
};

describe('PullToRefresh (arrastar para atualizar)', () => {
  beforeEach(() => {
    window.scrollY = 0;
  });

  it('no topo da página, puxar bastante e soltar atualiza, mostrando "Atualizando…" até terminar', async () => {
    let terminar;
    const onRefresh = vi.fn(() => new Promise((resolve) => { terminar = resolve; }));
    render(<PullToRefresh onRefresh={onRefresh} />);

    puxar(100, 300);

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('Atualizando…');
    await act(async () => terminar());
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('puxão curto não atualiza', () => {
    const onRefresh = vi.fn();
    render(<PullToRefresh onRefresh={onRefresh} />);
    puxar(100, 150);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('com a página rolada para baixo, arrastar é só rolar', () => {
    window.scrollY = 400;
    const onRefresh = vi.fn();
    render(<PullToRefresh onRefresh={onRefresh} />);
    puxar(100, 400);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('arrastar para cima não faz nada', () => {
    const onRefresh = vi.fn();
    render(<PullToRefresh onRefresh={onRefresh} />);
    puxar(400, 100);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('o indicador é só visual enquanto puxa e acompanha o dedo', () => {
    render(<PullToRefresh onRefresh={vi.fn()} />);
    const indicador = document.querySelector('.pull-refresh');
    expect(indicador).toHaveAttribute('aria-hidden', 'true');

    fireEvent.touchStart(window, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(window, { touches: [{ clientY: 200 }] });
    expect(indicador.style.getPropertyValue('--puxado')).toBe('50px');
  });
});
