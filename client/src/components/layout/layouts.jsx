import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { Header } from './Header.jsx';
import { asset } from '../../utils/asset.js';
import { AvisoNovaVersao } from './AvisoNovaVersao.jsx';

export function PublicLayout({ authForm = false, showLinks = true }) {
  return (
    <div className={`layout-public${authForm ? ' auth-form' : ''}`}>
      <header>
        <nav className="navegacao" aria-label="Principal">
          <Link to="/" className="logo" aria-label="TuneTalk, página inicial">
            <img src={asset('img/tunetalk-logo.svg')} alt="" />
            <span className="titulo-logo">TuneTalk</span>
          </Link>
          {showLinks && (
            <div className="navegacao__links">
              <Link className="link-header" to="/login">Entrar</Link>
              <Link className="link-header link-header--cta" to="/cadastrar">Cadastrar</Link>
            </div>
          )}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <AvisoNovaVersao />
    </div>
  );
}

export function AppLayout() {
  const { pathname } = useLocation();
  const navegacao = useNavigationType();

  // Com o topo e as abas fixos, cada página (ou aba do feed) começa do início. Ao voltar
  // (botão voltar), não: o feed devolve a rolagem de onde a pessoa estava.
  useEffect(() => {
    if (navegacao !== 'POP') window.scrollTo(0, 0);
  }, [pathname, navegacao]);

  return (
    <div className="layout-app">
      <Header />
      <main>
        <Outlet />
      </main>
      <AvisoNovaVersao />
    </div>
  );
}
