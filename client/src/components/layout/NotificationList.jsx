import { Link } from 'react-router-dom';
import { relativeTime } from '../../utils/relativeTime.js';
import { asset } from '../../utils/asset.js';

const ICONS = {
  like: 'bi-heart-fill',
  comment: 'bi-chat-fill',
  new_follower: 'bi-person-plus-fill',
  selo_fundador: 'bi-award-fill',
  mention: 'bi-at',
  voto_enquete: 'bi-bar-chart-fill',
  marco_posts: 'bi-trophy-fill',
  citacao: 'bi-shuffle',
  toca_natal: 'bi-gift-fill',
};

// Avisos do próprio TuneTalk (ex.: selo de fundador) aparecem com o logo, não com o nome de alguém.
const DO_TUNETALK = new Set(['selo_fundador', 'marco_posts', 'toca_natal']);

const targetOf = (notification) =>
  notification.tipo === 'new_follower' || !notification.postId
    ? `/perfil/${notification.autor.id}`
    : `/post/${notification.postId}`;

export function NotificationList({ notifications, onNavigate }) {
  if (!notifications) {
    return <p role="status" className="notif-status">Carregando notificações…</p>;
  }

  if (notifications.erro) {
    return <p role="alert" className="notif-status">Não foi possível carregar as notificações. Tente de novo.</p>;
  }

  if (notifications.length === 0) {
    return (
      <div className="notif-empty">
        <i className="bi bi-bell" aria-hidden="true" />
        <p className="notif-empty__title">Nada por aqui ainda</p>
        <p>Curtidas, comentários, votos nas suas enquetes e novos seguidores aparecem aqui.</p>
      </div>
    );
  }

  return (
    <ul className="notif-list">
      {notifications.map((notification) => (
        <li key={notification.id} className={notification.lida ? undefined : 'is-unread'}>
          <Link to={targetOf(notification)} className="notif" onClick={onNavigate}>
            <span className="notif__avatar">
              {DO_TUNETALK.has(notification.tipo)
                ? <img src={asset('img/tunetalk-logo.svg')} alt="" className="notif__logo" />
                : <img src={notification.autor.fotoPerfil} alt="" />}
              <span className={`notif__icon notif__icon--${notification.tipo}`} aria-hidden="true">
                <i className={`bi ${ICONS[notification.tipo] ?? 'bi-bell-fill'}`} />
              </span>
            </span>
            <span className="notif__body">
              <span className="notif__text">
                <strong>{DO_TUNETALK.has(notification.tipo) ? 'TuneTalk' : notification.autor.nome}</strong>{' '}
                <span>{notification.conteudo}</span>
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
