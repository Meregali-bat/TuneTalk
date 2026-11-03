import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChangePasswordModal } from './ChangePasswordModal.jsx';
import { usersApi } from '../../api/index.js';
import { renderWithProviders } from '../../test/render.jsx';

vi.mock('../../api/index.js', () => ({ usersApi: { changePassword: vi.fn() } }));

describe('ChangePasswordModal', () => {
  beforeEach(() => vi.clearAllMocks());

  const renderModal = (props = {}) =>
    renderWithProviders(<ChangePasswordModal open onClose={vi.fn()} onChanged={vi.fn()} {...props} />);
  const fill = async ({ atual = 'Atual!1', nova = 'Nova!123', repetir = nova } = {}) => {
    if (atual) await userEvent.type(screen.getByLabelText('Senha atual'), atual);
    if (nova) await userEvent.type(screen.getByLabelText('Nova senha'), nova);
    if (repetir) await userEvent.type(screen.getByLabelText('Repita a nova senha'), repetir);
  };
  const salvar = () => screen.getByRole('button', { name: 'Salvar nova senha' });

  it('abre como diálogo com os três campos de senha (com mostrar/ocultar) e as regras', () => {
    renderModal();
    const dialog = screen.getByRole('dialog', { name: 'Trocar senha' });
    expect(within(dialog).getByLabelText('Senha atual')).toHaveAttribute('autocomplete', 'current-password');
    expect(within(dialog).getByLabelText('Nova senha')).toHaveAttribute('autocomplete', 'new-password');
    expect(within(dialog).getAllByRole('button', { name: 'Mostrar senha' })).toHaveLength(3);
    expect(within(dialog).getByRole('list', { name: 'Regras da senha' })).toBeInTheDocument();
    expect(salvar()).toBeDisabled();
  });

  it('só libera quando a nova senha cumpre as regras e as duas batem', async () => {
    renderModal();
    await fill({ nova: 'fraca', repetir: 'fraca' });
    expect(salvar()).toBeDisabled();

    await userEvent.clear(screen.getByLabelText('Nova senha'));
    await userEvent.type(screen.getByLabelText('Nova senha'), 'Nova!123');
    expect(screen.getByText('As senhas não são iguais.')).toBeInTheDocument();
    expect(salvar()).toBeDisabled();

    await userEvent.clear(screen.getByLabelText('Repita a nova senha'));
    await userEvent.type(screen.getByLabelText('Repita a nova senha'), 'Nova!123');
    expect(salvar()).toBeEnabled();
  });

  it('salva e avisa quem abriu', async () => {
    usersApi.changePassword.mockResolvedValue(null);
    const onChanged = vi.fn();
    renderModal({ onChanged });
    await fill();
    await userEvent.click(salvar());

    expect(usersApi.changePassword).toHaveBeenCalledWith('Atual!1', 'Nova!123');
    expect(onChanged).toHaveBeenCalled();
  });

  it('mostra o erro do servidor (ex.: senha atual errada) e mantém o formulário', async () => {
    usersApi.changePassword.mockRejectedValue(new Error('A senha atual está incorreta.'));
    renderModal();
    await fill();
    await userEvent.click(salvar());

    expect(await screen.findByRole('alert')).toHaveTextContent('A senha atual está incorreta.');
    expect(screen.getByLabelText('Nova senha')).toHaveValue('Nova!123');
    expect(salvar()).toBeEnabled();
  });

  it('fecha por "Cancelar"', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalled();
  });
});
