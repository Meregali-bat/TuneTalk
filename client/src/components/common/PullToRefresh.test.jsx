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

  it('puxando, desce o que vem depois dele (os posts) junto com o dedo; o que vem antes fica', () => {
    render(
      <div>
        <nav data-testid="abas" />
        <PullToRefresh onRefresh={vi.fn()} />
        <ul data-testid="posts" />
      </div>,
    );
    const indicador = screen.getByTestId('pull-refresh');
    expect(indicador).toHaveAttribute('aria-hidden', 'true');
    expect(indicador).not.toHaveClass('is-ativo');

    fireEvent.touchStart(window, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(window, { touches: [{ clientY: 200 }] });
    // A lista lê a medida no documento; o CSS só desce os irmãos seguintes (.is-ativo ~ *).
    expect(document.documentElement.style.getPropertyValue('--ptr-puxado')).toBe('50px');
    expect(indicador).toHaveClass('is-ativo', 'is-puxando');
  });

  it('com uma janela aberta por cima, o gesto não atualiza a página', () => {
    document.body.classList.add('modal-open');
    const onRefresh = vi.fn();
    render(<PullToRefresh onRefresh={onRefresh} />);
    puxar(100, 400);
    expect(onRefresh).not.toHaveBeenCalled();
    document.body.classList.remove('modal-open');
  });
});
