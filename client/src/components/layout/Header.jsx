import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { notificationsApi } from '../../api/index.js';
import { Modal } from '../common/Modal.jsx';
import { NotificationList } from './NotificationList.jsx';

const iconButtonStyle = { background: 'none', border: 'none', padding: 0 };

export function Header() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(null);

  const refreshUnread = useCallback(() => {
    notificationsApi.unreadCount().then(setUnread).catch(() => {});
  }, []);

  // Atualiza o contador a cada navegação, como acontecia a cada carregamento de página no EJS.
  useEffect(refreshUnread, [pathname, refreshUnread]);

  const openNotifications = async () => {
    setOpen(true);
    setNotifications(null);
    const [list] = await Promise.all([
      notificationsApi.list(),
      notificationsApi.readAll().then(refreshUnread),
    ]);
    setNotifications(list);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeModal = useCallback(() => setOpen(false), []);

  return (
    <>
      <nav className="navbar navegacao">
        <div className="container d-flex flex-nowrap justify-content-between">
          <Link className="navbar-brand" to="/">
            <img src="/img/TuneTalk Logo.svg" alt="TuneTalk" width="70" height="70" />
          </Link>
          <div className="d-flex align-items-center">
            <button type="button" className="link-header" style={iconButtonStyle} aria-label="Notificações" onClick={openNotifications}>
              <i className="bi bi-bell" />
            </button>
            {unread > 0 && (
              <span className="notification-badge" data-testid="unread-count">{unread}</span>
            )}
            <Link className="link-header" to={`/perfil/${user.id}`} aria-label="Meu perfil">
              <i className="bi bi-person-circle" />
            </Link>
            <button type="button" className="link-header" style={iconButtonStyle} aria-label="Sair" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right" />
            </button>
          </div>
        </div>
      </nav>

      <Modal open={open} title="Notificações" onClose={closeModal}>
        <NotificationList notifications={notifications} onNavigate={closeModal} />
      </Modal>
    </>
  );
}
