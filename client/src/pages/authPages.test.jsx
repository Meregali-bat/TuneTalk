import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from './LoginPage.jsx';
import { RegisterPage } from './RegisterPage.jsx';
import { LandingPage } from './LandingPage.jsx';
import { ApiError } from '../api/http.js';
import { makeAuth, renderWithProviders } from '../test/render.jsx';

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
    expect(screen.getByLabelText('Nota 5 de 5')).toBeInTheDocument();
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
  it('faz login e vai para /foryou', async () => {
    const login = vi.fn().mockResolvedValue({ id: 1 });
    renderWithProviders(<LoginPage />, { auth: makeAuth({ user: null, login }) });

    await userEvent.type(screen.getByPlaceholderText('exemplo@gmail.com'), 'ana@x.com');
    await userEvent.type(screen.getByPlaceholderText('Senha'), 'Senha!1');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(login).toHaveBeenCalledWith('ana@x.com', 'Senha!1');
    expect(screen.getByTestId('location')).toHaveTextContent('/foryou');
  });

  it('mostra o erro e mantém o email digitado', async () => {
    const login = vi.fn().mockRejectedValue(new ApiError(401, 'Usuário ou senha incorretos.'));
    renderWithProviders(<LoginPage />, { auth: makeAuth({ user: null, login }) });

    await userEvent.type(screen.getByPlaceholderText('exemplo@gmail.com'), 'ana@x.com');
    await userEvent.type(screen.getByPlaceholderText('Senha'), 'errada');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário ou senha incorretos.');
    expect(screen.getByPlaceholderText('exemplo@gmail.com')).toHaveValue('ana@x.com');
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('linka para o cadastro', () => {
    renderWithProviders(<LoginPage />, { auth: makeAuth({ user: null }) });
    expect(screen.getByRole('link', { name: /Cadastre-se aqui/ })).toHaveAttribute('href', '/cadastrar');
  });
});

describe('RegisterPage', () => {
  const fill = async ({ nome = 'Bia', email = 'bia@x.com', senha = 'Senha!1', confirmar = senha } = {}) => {
    await userEvent.type(screen.getByPlaceholderText('seu nome'), nome);
    await userEvent.type(screen.getByPlaceholderText('exemplo@gmail.com'), email);
    await userEvent.type(screen.getByPlaceholderText('Senha'), senha);
    await userEvent.type(screen.getByPlaceholderText('Confirmar Senha'), confirmar);
  };

  it('esconde cada regra de senha quando cumprida', async () => {
    renderWithProviders(<RegisterPage />, { auth: makeAuth({ user: null }) });
    expect(screen.getByText('A senha deve conter no mínimo 6 caracteres.')).toBeInTheDocument();
    expect(screen.getByText('A senha deve conter uma letra maiúscula.')).toBeInTheDocument();
    expect(screen.getByText('A senha deve conter um símbolo.')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Senha'), 'A!');
    expect(screen.queryByText('A senha deve conter uma letra maiúscula.')).toBeNull();
    expect(screen.queryByText('A senha deve conter um símbolo.')).toBeNull();
    expect(screen.getByText('A senha deve conter no mínimo 6 caracteres.')).toBeInTheDocument();
  });

  it('avisa e bloqueia o envio quando as senhas são diferentes', async () => {
    const register = vi.fn();
    renderWithProviders(<RegisterPage />, { auth: makeAuth({ user: null, register }) });

    await fill({ confirmar: 'Outra!1' });
    expect(screen.getByText('Senhas diferentes.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(register).not.toHaveBeenCalled();
  });

  it('cadastra com a foto escolhida e vai para /foryou', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
    const register = vi.fn().mockResolvedValue({ id: 5 });
    renderWithProviders(<RegisterPage />, { auth: makeAuth({ user: null, register }) });

    const file = new File(['img'], 'eu.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Foto de perfil'), file);
    expect(screen.getByAltText('Prévia da foto de perfil')).toHaveAttribute('src', 'blob:preview');

    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    const form = register.mock.calls[0][0];
    expect(form.get('nome')).toBe('Bia');
    expect(form.get('email')).toBe('bia@x.com');
    expect(form.get('senha')).toBe('Senha!1');
    expect(form.get('imagem')).toBe(file);
    expect(screen.getByTestId('location')).toHaveTextContent('/foryou');
  });

  it('mostra o erro do servidor e mantém os dados', async () => {
    const register = vi.fn().mockRejectedValue(new ApiError(409, 'Já existe um usuário com o mesmo nome ou email'));
    renderWithProviders(<RegisterPage />, { auth: makeAuth({ user: null, register }) });

    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe um usuário com o mesmo nome ou email');
    expect(screen.getByPlaceholderText('seu nome')).toHaveValue('Bia');
  });
});
