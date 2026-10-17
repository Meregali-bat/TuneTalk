import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from './App.jsx';
import { AuthContext } from './auth/AuthContext.jsx';
import { makeAuth } from './test/render.jsx';
import { notificationsApi, postsApi, usersApi } from './api/index.js';

vi.mock('aos', () => ({ default: { init: vi.fn() } }));
vi.mock('./api/index.js', () => ({
  notificationsApi: { unreadCount: vi.fn(), list: vi.fn(), readAll: vi.fn() },
  postsApi: { feed: vi.fn(), get: vi.fn() },
  usersApi: { profile: vi.fn() },
  musicApi: { search: vi.fn() },
}));

const renderAt = (route, auth = makeAuth()) =>
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[route]}>
        <AppRoutes />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe('rotas da aplicação', () => {
  beforeEach(() => {
    notificationsApi.unreadCount.mockResolvedValue(0);
    postsApi.feed.mockResolvedValue([]);
  });

  it('visitante vê a landing page com links de login e cadastro', () => {
    renderAt('/', makeAuth({ user: null }));
    expect(screen.getByText(/seja bem-vindo\(a\) ao/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Cadastrar' })).toHaveAttribute('href', '/cadastrar');
  });

  it('visitante acessa /login e /cadastrar', () => {
    renderAt('/login', makeAuth({ user: null }));
    expect(screen.getByText(/Bem-vindo de volta/)).toBeInTheDocument();
  });

  it('visitante em rota privada vai para o login', () => {
    renderAt('/foryou', makeAuth({ user: null }));
    expect(screen.getByText(/Bem-vindo de volta/)).toBeInTheDocument();
  });

  it('usuário logado na raiz vai para o feed com o header', async () => {
    renderAt('/');
    expect(await screen.findByText('Nenhum post por aqui ainda.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notificações' })).toBeInTheDocument();
    expect(postsApi.feed).toHaveBeenCalledWith('foryou');
  });

  it('/seguindo usa o feed seguindo', async () => {
    renderAt('/seguindo');
    await screen.findByText('Nenhum post por aqui ainda.');
    expect(postsApi.feed).toHaveBeenCalledWith('seguindo');
  });

  it('/perfil/:id e /post/:id carregam as páginas certas', async () => {
    usersApi.profile.mockRejectedValue(new Error('Usuário não encontrado.'));
    renderAt('/perfil/5');
    expect(await screen.findByText('Usuário não encontrado.')).toBeInTheDocument();
    expect(usersApi.profile).toHaveBeenCalledWith('5');
  });

  it('rota desconhecida volta para a raiz', async () => {
    renderAt('/xpto', makeAuth({ user: null }));
    expect(screen.getByText(/seja bem-vindo\(a\) ao/)).toBeInTheDocument();
  });
});
