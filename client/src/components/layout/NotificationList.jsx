import { Link } from 'react-router-dom';
import { relativeTime } from '../../utils/relativeTime.js';

const ICONS = { like: 'bi-heart-fill', comment: 'bi-chat-fill', new_follower: 'bi-person-plus-fill' };

const targetOf = (notification) =>
  notification.tipo === 'new_follower' || !notification.postId
    ? `/perfil/${notification.autor.id}`
    : `/post/${notification.postId}`;

export function NotificationList({ notifications, onNavigate }) {
  if (!notifications) {
    return <p role="status" className="notif-status">Carregando notificações…</p>;
  }

  if (notifications.length === 0) {
    return (
      <div className="notif-empty">
        <i className="bi bi-bell" aria-hidden="true" />
        <p className="notif-empty__title">Nada por aqui ainda</p>
        <p>Curtidas, comentários e novos seguidores aparecem aqui.</p>
      </div>
    );
  }

  return (
    <ul className="notif-list">
      {notifications.map((notification) => (
        <li key={notification.id} className={notification.lida ? undefined : 'is-unread'}>
          <Link to={targetOf(notification)} className="notif" onClick={onNavigate}>
            <span className="notif__avatar">
              <img src={notification.autor.fotoPerfil} alt="" />
              <span className={`notif__icon notif__icon--${notification.tipo}`} aria-hidden="true">
                <i className={`bi ${ICONS[notification.tipo] ?? 'bi-bell-fill'}`} />
              </span>
            </span>
            <span className="notif__body">
              <span className="notif__text">
                <strong>{notification.autor.nome}</strong> <span>{notification.conteudo}</span>
              </span>
              {notification.data && (
                <time className="notif__time" dateTime={notification.data}>{relativeTime(notification.data)}</time>
              )}
            </span>
            {!notification.lida && (
              <span className="notif__dot">
                <span className="visually-hidden">Não lida</span>
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
