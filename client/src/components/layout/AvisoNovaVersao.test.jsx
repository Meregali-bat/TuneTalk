import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { AvisoNovaVersao, INTERVALO_VERSAO_MS } from './AvisoNovaVersao.jsx';

describe('AvisoNovaVersao', () => {
  afterEach(() => vi.useRealTimers());

  it('mesma versão publicada: não mostra nada', async () => {
    const buscar = vi.fn().mockResolvedValue('abc');
    render(<AvisoNovaVersao versaoAtual="abc" buscar={buscar} />);
    await act(async () => {});
    expect(buscar).toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('saiu versão nova: oferece atualizar', async () => {
    render(<AvisoNovaVersao versaoAtual="abc" buscar={vi.fn().mockResolvedValue('def')} />);
    expect(await screen.findByRole('status')).toHaveTextContent('Tem uma versão nova do TuneTalk.');
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeInTheDocument();
  });

  it('confere de novo a cada 5 min e ao voltar para o app', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const buscar = vi.fn().mockResolvedValue('abc');
    render(<AvisoNovaVersao versaoAtual="abc" buscar={buscar} />);
    await act(async () => {});
    expect(buscar).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(INTERVALO_VERSAO_MS));
    expect(buscar).toHaveBeenCalledTimes(2);

    buscar.mockResolvedValue('nova');
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(await screen.findByRole('status')).toBeInTheDocument();
  });

  it('em desenvolvimento/demo não confere; sem rede não quebra', async () => {
    const buscar = vi.fn();
    render(<AvisoNovaVersao versaoAtual="dev" buscar={buscar} />);
    expect(buscar).not.toHaveBeenCalled();
    render(<AvisoNovaVersao versaoAtual="abc" buscar={vi.fn().mockRejectedValue(new Error('offline'))} />);
    await act(async () => {});
    expect(screen.queryByRole('status')).toBeNull();
  });
});
