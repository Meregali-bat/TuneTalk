import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from './LoginPage.jsx';
import { RegisterPage } from './RegisterPage.jsx';
import { UsernamePage } from './UsernamePage.jsx';
import { LandingPage } from './LandingPage.jsx';
import { ApiError } from '../api/http.js';
import { usersApi } from '../api/index.js';
import { makeAuth, renderWithProviders } from '../test/render.jsx';

vi.mock('../api/index.js', () => ({ usersApi: { setUsername: vi.fn() } }));

describe('LandingPage', () => {
  it('apresenta a proposta com chamadas para cadastro e login', () => {
    renderWithProviders(<LandingPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Avalie, comente e descubra música');
    const ctas = screen.getAllByRole('link', { name: 'Criar conta' });
    expect(ctas.length).toBeGreaterThanOrEqual(2);
    ctas.forEach((link) => expect(link).toHaveAttribute('href', '/cadastrar'));
    expect(screen.getByRole('link', { name: 'Já tenho conta' })).toHaveAttribute('href', '/login');
  });

  it('mostra um post de exemplo com nota em estrelas', () => {
    renderWithProviders(<LandingPage />);
    const exemplo = screen.getByRole('figure', { name: 'Exemplo de post no TuneTalk' });
    expect(exemplo).toHaveTextContent('Abbey Road');
    expect(screen.getByLabelText('Nota 9 de 10')).toBeInTheDocument();
  });

  it('lista o que dá para fazer e como funciona, em ordem', () => {
    renderWithProviders(<LandingPage />);

    ['Debata sobre músicas', 'Compartilhe o que ouve', 'Monte seu perfil', 'Descubra artistas novos'].forEach((titulo) => {
      expect(screen.getByRole('heading', { name: titulo })).toBeInTheDocument();
    });

    const passos = screen.getAllByRole('listitem').map((item) => item.querySelector('h3')?.textContent).filter(Boolean);
    expect(passos).toEqual(['Busque a música', 'Dê sua nota', 'Converse']);
  });
});

describe('LoginPage', () => {
  const fillLogin = async (email = 'ana@x.com', senha = 'Senha!1') => {
    await userEvent.type(screen.getByLabelText('Email'), email);
    await userEvent.type(screen.getByLabelText('Senha'), senha);
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  };

  it('faz login e vai para o feed', async () => {
    const login = vi.fn().mockResolvedValue({ id: 1, nome: 'ana' });
    renderWithProviders(<LoginPage />, { auth: makeAuth({ user: null, login }) });

    await fillLogin();

    expect(login).toHaveBeenCalledWith('ana@x.com', 'Senha!1');
    expect(screen.getByTestId('location')).toHaveTextContent('/foryou');
  });

  it('quem ainda não escolheu o nome de usuário vai para /bem-vindo', async () => {
    const login = vi.fn().mockResolvedValue({ id: 9, nome: null });
    renderWithProviders(<LoginPage />, { auth: makeAuth({ user: null, login }) });
    await fillLogin();
    expect(screen.getByTestId('location')).toHaveTextContent('/bem-vindo');
  });

  it('mostra o erro, que fica visível, e mantém o email digitado', async () => {
    const login = vi.fn().mockRejectedValue(new ApiError(401, 'Email ou senha incorretos.'));
    renderWithProviders(<LoginPage />, { auth: makeAuth({ user: null, login }) });

    await fillLogin('ana@x.com', 'errada');

    expect(await screen.findByRole('alert')).toHaveTextContent('Email ou senha incorretos.');
    expect(screen.getByLabelText('Email')).toHaveValue('ana@x.com');
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });

  it('linka para o cadastro', () => {
    renderWithProviders(<LoginPage />, { auth: makeAuth({ user: null }) });
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastrar');
  });
});

describe('RegisterPage', () => {
  const fill = async ({ email = 'bia@x.com', senha = 'Senha!1', confirmar = senha } = {}) => {
    await userEvent.type(screen.getByLabelText('Email'), email);
    await userEvent.type(screen.getByLabelText('Senha'), senha);
    await userEvent.type(screen.getByLabelText('Confirmar senha'), confirmar);
  };

  it('pede só email e senha (sem nome nem foto)', () => {
    renderWithProviders(<RegisterPage />, { auth: makeAuth({ user: null }) });
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.queryByLabelText(/foto/i)).toBeNull();
    expect(screen.queryByLabelText(/nome/i)).toBeNull();
  });

  it('marca cada regra de senha conforme é cumprida', async () => {
    renderWithProviders(<RegisterPage />, { auth: makeAuth({ user: null }) });
    const regras = () => screen.getAllByRole('listitem').map((item) => item.textContent);

    expect(regras()).toEqual([
      'Pendente: Pelo menos 6 caracteres',
      'Pendente: Uma letra maiúscula',
      'Pendente: Um símbolo (ex.: ! @ #)',
    ]);

    await userEvent.type(screen.getByLabelText('Senha'), 'A!');
    expect(regras()).toEqual([
      'Pendente: Pelo menos 6 caracteres',
      'Cumprida: Uma letra maiúscula',
      'Cumprida: Um símbolo (ex.: ! @ #)',
    ]);
  });

  it('só libera o botão com senha válida e confirmação igual', async () => {
    renderWithProviders(<RegisterPage />, { auth: makeAuth({ user: null }) });
    const botao = screen.getByRole('button', { name: 'Criar conta' });
    expect(botao).toBeDisabled();

    await fill({ confirmar: 'Outra!1' });
    expect(screen.getByText('As senhas não são iguais.')).toBeInTheDocument();
    expect(botao).toBeDisabled();

    await userEvent.clear(screen.getByLabelText('Confirmar senha'));
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'Senha!1');
    expect(screen.queryByText('As senhas não são iguais.')).toBeNull();
    expect(botao).toBeEnabled();
  });

  it('cria a conta e segue para a escolha do nome de usuário', async () => {
    const register = vi.fn().mockResolvedValue({ id: 5, nome: null });
    renderWithProviders(<RegisterPage />, { auth: makeAuth({ user: null, register }) });

    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(register).toHaveBeenCalledWith({ email: 'bia@x.com', senha: 'Senha!1' });
    expect(screen.getByTestId('location')).toHaveTextContent('/bem-vindo');
  });

  it('mostra o erro do servidor e mantém o email', async () => {
    const register = vi.fn().mockRejectedValue(new ApiError(409, 'Já existe uma conta com esse email.'));
    renderWithProviders(<RegisterPage />, { auth: makeAuth({ user: null, register }) });

    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma conta com esse email.');
    expect(screen.getByLabelText('Email')).toHaveValue('bia@x.com');
  });

  it('linka para o login', () => {
    renderWithProviders(<RegisterPage />, { auth: makeAuth({ user: null }) });
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
  });
});

describe('UsernamePage', () => {
  const novo = { id: 9, nome: null, email: 'novo@x.com' };

  it('valida o nome enquanto digita', async () => {
    renderWithProviders(<UsernamePage />, { auth: makeAuth({ user: novo }) });
    const botao = screen.getByRole('button', { name: 'Continuar' });
    expect(botao).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Nome de usuário'), 'an a');
    const regras = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(regras).toEqual([
      'Cumprida: De 3 a 30 caracteres',
      'Pendente: Só letras sem acento, números, ponto e underline',
    ]);
    expect(botao).toBeDisabled();
  });

  it('salva o nome, atualiza a sessão e abre o feed', async () => {
    usersApi.setUsername.mockResolvedValue({ ...novo, nome: 'novo.user' });
    const updateUser = vi.fn();
    renderWithProviders(<UsernamePage />, { auth: makeAuth({ user: novo, updateUser }) });

    await userEvent.type(screen.getByLabelText('Nome de usuário'), 'novo.user');
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(usersApi.setUsername).toHaveBeenCalledWith('novo.user');
    expect(updateUser).toHaveBeenCalledWith({ nome: 'novo.user' });
    expect(screen.getByTestId('location')).toHaveTextContent('/foryou');
  });

  it('mostra quando o nome já está em uso', async () => {
    usersApi.setUsername.mockRejectedValue(new ApiError(409, 'Esse nome de usuário já está em uso.'));
    renderWithProviders(<UsernamePage />, { auth: makeAuth({ user: novo }) });

    await userEvent.type(screen.getByLabelText('Nome de usuário'), 'ana');
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Esse nome de usuário já está em uso.');
  });

  it('quem já tem nome vai direto para o feed', () => {
    renderWithProviders(<UsernamePage />);
    expect(screen.getByTestId('location')).toHaveTextContent('/foryou');
  });

  it('permite sair da conta', async () => {
    const logout = vi.fn().mockResolvedValue();
    renderWithProviders(<UsernamePage />, { auth: makeAuth({ user: novo, logout }) });
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(logout).toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });
});
