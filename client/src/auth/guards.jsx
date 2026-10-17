import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

// Para onde mandar quem já está logado: o feed, ou a escolha do nome de usuário se ainda falta.
export const homeFor = (user) => (user.nome ? '/foryou' : '/bem-vindo');

export function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

export function RequireUsername() {
  const { user } = useAuth();
  return user.nome ? <Outlet /> : <Navigate to="/bem-vindo" replace />;
}

export function PublicOnlyRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to={homeFor(user)} replace /> : <Outlet />;
}
