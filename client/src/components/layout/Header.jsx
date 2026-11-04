import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { notificationsApi } from '../../api/index.js';
import { Modal } from '../common/Modal.jsx';
import { NotificationList } from './NotificationList.jsx';
import { asset } from '../../utils/asset.js';

// De quanto em quanto tempo o app confere se chegou notificação nova (só com a aba visível).
export const INTERVALO_NOTIFICACOES_MS = 30_000;

export function Header() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const unreadId = useId();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(null);

  const refreshUnread = useCallback(() => {
    notificationsApi.unreadCount().then(setUnread).catch(() => {});
  }, []);

  // Atualiza o contador a cada navegação.
  useEffect(refreshUnread, [pathname, refreshUnread]);

  // E sozinho: a cada 30 s enquanto a aba está visível, e na hora em que a pessoa volta para o app
  // (troca de aba, reabre o atalho do iPhone). Com a aba escondida, não fica consultando o servidor.
  useEffect(() => {
    if (!user) return undefined;
    const conferir = () => {
      if (document.visibilityState === 'visible') refreshUnread();
    };
    const intervalo = setInterval(conferir, INTERVALO_NOTIFICACOES_MS);
    document.addEventListener('visibilitychange', conferir);
    window.addEventListener('focus', conferir);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', conferir);
      window.removeEventListener('focus', conferir);
    };
  }, [user, refreshUnread]);

  // Com a lista aberta, notificação nova que chegar entra nela (e já fica marcada como lida).
  const abertoRef = useRef(false);
  abertoRef.current = open;
  useEffect(() => {
    if (!open || unread === 0) return;
    let ativo = true;
    (async () => {
      try {
        const lista = await notificationsApi.list();
        if (!ativo || !abertoRef.current) return;
        setNotifications(lista);
        await notificationsApi.readAll();
        setUnread(0);
      } catch {
        // Sem rede: a lista aberta continua como estava.
      }
    })();
    return () => { ativo = false; };
  }, [open, unread]);

  // Busca a lista antes de marcar como lidas, para destacar o que é novo.
  const openNotifications = async () => {
    setOpen(true);
    setUnread(0); // a lista abre agora; o que chegar depois entra pelo efeito acima
    setNotifications(null);
    try {
      setNotifications(await notificationsApi.list());
      await notificationsApi.readAll();
    } catch {
      setNotifications((current) => current ?? []);
    }
    refreshUnread();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeModal = useCallback(() => setOpen(false), []);

  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <Link to="/foryou" className="app-logo" aria-label="TuneTalk, início">
            <img src={asset('img/tunetalk-logo.svg')} alt="" />
            <span>TuneTalk</span>
          </Link>
          <nav className="app-header__actions" aria-label="Conta">
            <Link className="icon-button" to="/buscar" aria-label="Buscar">
              <i className="bi bi-search" aria-hidden="true" />
            </Link>
            <button
              type="button"
              className="icon-button app-header__bell"
              aria-label="Notificações"
              aria-haspopup="dialog"
              aria-describedby={unread > 0 ? unreadId : undefined}
              onClick={openNotifications}
            >
              <i className="bi bi-bell" aria-hidden="true" />
              {unread > 0 && (
                <span className="app-badge" data-testid="unread-count" aria-hidden="true">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            {unread > 0 && <span id={unreadId} className="visually-hidden">{unread} não lidas</span>}
            <Link className="icon-button" to={`/perfil/${user.id}`} aria-label="Meu perfil">
              <i className="bi bi-person-circle" aria-hidden="true" />
            </Link>
            <button type="button" className="icon-button" aria-label="Sair" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </header>

      <Modal open={open} title="Notificações" onClose={closeModal} variant="panel">
        <NotificationList notifications={notifications} onNavigate={closeModal} />
      </Modal>
    </>
  );
}
