import { Link, Outlet } from 'react-router-dom';
import { Header } from './Header.jsx';

export function PublicLayout({ authForm = false }) {
  return (
    <div className={`layout-public${authForm ? ' auth-form' : ''}`}>
      <header>
        <div className="navegacao">
          <Link to="/" className="link-header">
            <div className="logo">
              <img src="/img/TuneTalk Logo.svg" alt="logo" />
              <span className="titulo-logo">TuneTalk</span>
            </div>
          </Link>
          <Link className="link-header" to="/login">Login</Link>
          <Link className="link-header" to="/cadastrar">Cadastrar</Link>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export function AppLayout() {
  return (
    <div className="layout-app">
      <header>
        <Header />
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
