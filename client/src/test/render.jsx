import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthContext } from '../auth/AuthContext.jsx';

export const me = { id: 1, nome: 'Ana', email: 'ana@x.com' };

export function makeAuth(overrides = {}) {
  return {
    user: me,
    loading: false,
    login: async () => me,
    register: async () => me,
    logout: async () => {},
    updateUser: () => {},
    ...overrides,
  };
}

export function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

/**
 * Renderiza dentro de um MemoryRouter com AuthContext controlado.
 * `path` permite testar componentes que leem parâmetros da rota (ex.: /perfil/:id).
 */
export function renderWithProviders(ui, { route = '/', path = '*', auth = makeAuth() } = {}) {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="*" element={null} />
        </Routes>
        <LocationDisplay />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}
