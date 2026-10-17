import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { Modal } from '../common/Modal.jsx';
import { FollowButton } from '../common/FollowButton.jsx';

export function UserListModal({ open, title, users, seguindoIds, onClose, onFollowChange }) {
  const { user: me } = useAuth();

  return (
    <Modal open={open} title={title} onClose={onClose} centered>
      {users.length === 0 && <p className="notif-status">Ninguém por aqui ainda.</p>}
      {users.length > 0 && (
        <ul className="user-list">
          {users.map((usuario) => (
            <li key={usuario.id} className="user-row">
              <Link to={`/perfil/${usuario.id}`} className="user-row__link" onClick={onClose}>
                <img src={usuario.fotoPerfil} alt="" className="user-row__avatar" />
                <span className="user-row__info">
                  <span className="user-row__name">{usuario.nome}</span>
                  {usuario.bio && <span className="user-row__bio">{usuario.bio}</span>}
                </span>
              </Link>
              {usuario.id !== me.id && (
                <FollowButton
                  size="sm"
                  userId={usuario.id}
                  following={seguindoIds.includes(usuario.id)}
                  onChange={onFollowChange}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
