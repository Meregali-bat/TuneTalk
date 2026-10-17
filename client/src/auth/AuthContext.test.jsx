import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import { PublicOnlyRoute, RequireAuth, RequireUsername } from './guards.jsx';
import { authApi } from '../api/index.js';
import { ApiError } from '../api/http.js';
import { makeAuth } from '../test/render.jsx';
import { AuthContext } from './AuthContext.jsx';

vi.mock('../api/index.js', () => ({
  authApi: { me: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() },
}));

const ana = { id: 1, nome: 'Ana', email: 'ana@x.com' };
const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe('AuthProvider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('carrega o usuário da sessão ao iniciar', async () => {
    authApi.me.mockResolvedValue(ana);
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(ana);
  });

  it('fica deslogado quando a sessão não existe', async () => {
    authApi.me.mockRejectedValue(new ApiError(401, 'Não autenticado.'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it('login, updateUser e logout atualizam o usuário', async () => {
    authApi.me.mockRejectedValue(new ApiError(401, ''));
    authApi.login.mockResolvedValue(ana);
    authApi.logout.mockResolvedValue(null);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.login('ana@x.com', 'Senha!1'));
    expect(authApi.login).toHaveBeenCalledWith('ana@x.com', 'Senha!1');
    expect(result.current.user).toEqual(ana);

    act(() => result.current.updateUser({ nome: 'Ana B' }));
    expect(result.current.user.nome).toBe('Ana B');

    await act(() => result.current.logout());
    expect(result.current.user).toBeNull();
  });

  it('register loga o usuário recém-criado', async () => {
    authApi.me.mockRejectedValue(new ApiError(401, ''));
    authApi.register.mockResolvedValue(ana);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.register({ email: 'ana@x.com', senha: 'Senha!1' }));
    expect(authApi.register).toHaveBeenCalledWith({ email: 'ana@x.com', senha: 'Senha!1' });
    expect(result.current.user).toEqual(ana);
  });
});

describe('guards de rota', () => {
  const renderRoutes = (auth, route) =>
    render(
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<p>tela de login</p>} />
            </Route>
            <Route element={<RequireAuth />}>
              <Route path="/bem-vindo" element={<p>escolher nome</p>} />
              <Route element={<RequireUsername />}>
                <Route path="/foryou" element={<p>feed</p>} />
              </Route>
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

  it('redireciona visitante de rota privada para /login', () => {
    renderRoutes(makeAuth({ user: null }), '/foryou');
    expect(screen.getByText('tela de login')).toBeInTheDocument();
  });

  it('redireciona usuário logado de rota pública para /foryou', () => {
    renderRoutes(makeAuth(), '/login');
    expect(screen.getByText('feed')).toBeInTheDocument();
  });

  it('quem ainda não tem nome de usuário vai para /bem-vindo', () => {
    renderRoutes(makeAuth({ user: { id: 9, nome: null, email: 'n@x.com' } }), '/foryou');
    expect(screen.getByText('escolher nome')).toBeInTheDocument();
  });

  it('em rota pública, quem não tem nome também vai para /bem-vindo', () => {
    renderRoutes(makeAuth({ user: { id: 9, nome: null, email: 'n@x.com' } }), '/login');
    expect(screen.getByText('escolher nome')).toBeInTheDocument();
  });

  it('não renderiza nada enquanto a sessão carrega', () => {
    const { container } = renderRoutes(makeAuth({ user: null, loading: true }), '/foryou');
    expect(container).toBeEmptyDOMElement();
  });
});
