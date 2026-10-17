import { useCallback, useEffect, useId, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { notificationsApi } from '../../api/index.js';
import { Modal } from '../common/Modal.jsx';
import { NotificationList } from './NotificationList.jsx';
import { asset } from '../../utils/asset.js';

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

  // Busca a lista antes de marcar como lidas, para destacar o que é novo.
  const openNotifications = async () => {
    setOpen(true);
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
      <div className="app-header">
        <div className="app-header__inner">
          <Link to="/foryou" className="app-logo" aria-label="TuneTalk, início">
            <img src={asset('img/tunetalk-logo.svg')} alt="" />
            <span>TuneTalk</span>
          </Link>
          <nav className="app-header__actions" aria-label="Conta">
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
      </div>

      <Modal open={open} title="Notificações" onClose={closeModal} variant="panel">
        <NotificationList notifications={notifications} onNavigate={closeModal} />
      </Modal>
    </>
  );
}
