import { Link } from 'react-router-dom';

const linkStyle = { color: '#fff', textDecoration: 'none' };

const targetOf = (notification) =>
  notification.tipo === 'new_follower' || !notification.postId
    ? `/perfil/${notification.autor.id}`
    : `/post/${notification.postId}`;

export function NotificationList({ notifications, onNavigate }) {
  if (!notifications) return <p>Carregando...</p>;
  if (notifications.length === 0) return <p>Nenhuma notificação.</p>;

  return notifications.map((notification) => (
    <div key={notification.id} className="notification-item mb-4" style={{ display: 'flex', alignItems: 'center' }}>
      <Link to={`/perfil/${notification.autor.id}`} style={linkStyle} onClick={onNavigate}>
        <img
          src={notification.autor.fotoPerfil}
          className="profile-picture"
          style={{ width: 50, height: 50, marginRight: 10 }}
          alt={`Foto de perfil de ${notification.autor.nome}`}
        />
      </Link>
      <div>
        <Link to={targetOf(notification)} style={linkStyle} onClick={onNavigate}>
          <strong>{notification.autor.nome}</strong>
          <p style={{ margin: 0 }}>{notification.conteudo}</p>
        </Link>
      </div>
    </div>
  ));
}
