import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ForgotPasswordPage } from './ForgotPasswordPage.jsx';
import { ResetPasswordPage } from './ResetPasswordPage.jsx';
import { authApi } from '../api/index.js';
import { makeAuth, renderWithProviders } from '../test/render.jsx';

vi.mock('../api/index.js', () => ({ authApi: { forgotPassword: vi.fn(), resetPassword: vi.fn() } }));

const anonimo = makeAuth({ user: null });

describe('ForgotPasswordPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pede o email e confirma sem dizer se a conta existe', async () => {
    authApi.forgotPassword.mockResolvedValue(null);
    renderWithProviders(<ForgotPasswordPage />, { auth: anonimo });

    expect(screen.getByRole('heading', { name: 'Esqueceu a senha?' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Email'), ' ana@x.com ');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));

    expect(authApi.forgotPassword).toHaveBeenCalledWith('ana@x.com');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Se existir uma conta com ana@x.com, enviamos um link para criar uma senha nova. Ele vale por 1 hora. Confira também o spam.',
    );
    expect(screen.getByRole('link', { name: 'Voltar para o login' })).toHaveAttribute('href', '/login');
  });

  it('mostra erro de rede', async () => {
    authApi.forgotPassword.mockRejectedValue(new Error('Sem conexão.'));
    renderWithProviders(<ForgotPasswordPage />, { auth: anonimo });
    await userEvent.type(screen.getByLabelText('Email'), 'ana@x.com');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão.');
  });
});

describe('ResetPasswordPage', () => {
  beforeEach(() => vi.clearAllMocks());

  const renderReset = (hash = '#token=abc123', auth = anonimo) =>
    renderWithProviders(<ResetPasswordPage />, { route: `/redefinir-senha${hash}`, auth });
  const fill = async (nova = 'Nova!123', repetir = nova) => {
    await userEvent.type(screen.getByLabelText('Nova senha'), nova);
    await userEvent.type(screen.getByLabelText('Repita a nova senha'), repetir);
  };

  it('com o código do link, cria a senha nova e manda para o login', async () => {
    authApi.resetPassword.mockResolvedValue(null);
    renderReset();

    expect(screen.getByRole('list', { name: 'Regras da senha' })).toBeInTheDocument();
    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));

    expect(authApi.resetPassword).toHaveBeenCalledWith('abc123', 'Nova!123');
    expect(await screen.findByRole('heading', { name: 'Senha nova salva!' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
  });

  it('se alguém estava logado neste aparelho, sai da conta (todas as sessões caem)', async () => {
    authApi.resetPassword.mockResolvedValue(null);
    const logout = vi.fn();
    renderReset('#token=abc123', makeAuth({ logout }));
    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    await screen.findByRole('heading', { name: 'Senha nova salva!' });
    expect(logout).toHaveBeenCalled();
  });

  it('só libera com senha válida e repetida igual', async () => {
    renderReset();
    const salvar = screen.getByRole('button', { name: 'Salvar nova senha' });
    await fill('Nova!123', 'Nova!12');
    expect(screen.getByText('As senhas não são iguais.')).toBeInTheDocument();
    expect(salvar).toBeDisabled();
  });

  it('link vencido: mostra o erro e oferece pedir outro', async () => {
    authApi.resetPassword.mockRejectedValue(new Error('Este link é inválido ou já expirou. Peça um novo.'));
    renderReset();
    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Este link é inválido ou já expirou. Peça um novo.');
    expect(screen.getByRole('link', { name: 'Pedir outro link' })).toHaveAttribute('href', '/esqueci-senha');
  });

  it('sem código no endereço, explica e oferece pedir o link', () => {
    renderReset('');
    expect(screen.getByText('Este endereço está incompleto. Abra o link do email de novo ou peça outro.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedir outro link' })).toHaveAttribute('href', '/esqueci-senha');
    expect(screen.queryByLabelText('Nova senha')).toBeNull();
  });
});
