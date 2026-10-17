import { Link, Outlet } from 'react-router-dom';
import { Header } from './Header.jsx';
import { asset } from '../../utils/asset.js';

export function PublicLayout({ authForm = false }) {
  return (
    <div className={`layout-public${authForm ? ' auth-form' : ''}`}>
      <header>
        <nav className="navegacao" aria-label="Principal">
          <Link to="/" className="logo" aria-label="TuneTalk, página inicial">
            <img src={asset('img/tunetalk-logo.svg')} alt="" />
            <span className="titulo-logo">TuneTalk</span>
          </Link>
          <div className="navegacao__links">
            <Link className="link-header" to="/login">Entrar</Link>
            <Link className="link-header link-header--cta" to="/cadastrar">Cadastrar</Link>
          </div>
        </nav>
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
