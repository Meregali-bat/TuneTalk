import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemoBanner } from './DemoBanner.jsx';
import { DEMO_LOGIN } from './seed.js';
import { makeAuth, renderWithProviders } from '../test/render.jsx';

describe('DemoBanner', () => {
  it('avisa que os dados são fictícios e mostra o login de demonstração', () => {
    renderWithProviders(<DemoBanner api={{ reset: vi.fn() }} />, { auth: makeAuth({ user: null }) });
    expect(screen.getByText(/dados fictícios/i)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(DEMO_LOGIN.email))).toBeInTheDocument();
  });

  it('"Entrar como Ana" faz login e abre o feed', async () => {
    const login = vi.fn().mockResolvedValue({ id: 1 });
    renderWithProviders(<DemoBanner api={{ reset: vi.fn() }} />, { auth: makeAuth({ user: null, login }) });

    await userEvent.click(screen.getByRole('button', { name: 'Entrar como Ana' }));

    expect(login).toHaveBeenCalledWith(DEMO_LOGIN.email, DEMO_LOGIN.senha);
    expect(screen.getByTestId('location')).toHaveTextContent('/foryou');
  });

  it('esconde o botão de entrar quando já está logado', () => {
    renderWithProviders(<DemoBanner api={{ reset: vi.fn() }} />);
    expect(screen.queryByRole('button', { name: 'Entrar como Ana' })).toBeNull();
  });

  it('"Restaurar dados" volta ao estado inicial', async () => {
    const reset = vi.fn();
    const onReset = vi.fn();
    renderWithProviders(<DemoBanner api={{ reset }} onReset={onReset} />);
    await userEvent.click(screen.getByRole('button', { name: 'Restaurar dados' }));
    expect(reset).toHaveBeenCalled();
    expect(onReset).toHaveBeenCalled();
  });
});
