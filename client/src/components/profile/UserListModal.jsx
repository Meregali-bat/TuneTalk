import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { Modal } from '../common/Modal.jsx';
import { FollowButton } from '../common/FollowButton.jsx';

export function UserListModal({ open, title, users, seguindoIds, onClose, onFollowChange }) {
  const { user: me } = useAuth();

  return (
    <Modal open={open} title={title} onClose={onClose} centered>
      {users.length === 0 && <p>Ninguém por aqui ainda.</p>}
      {users.map((usuario) => (
        <div key={usuario.id} className="d-flex justify-content-between mb-3">
          <Link style={{ color: '#fff' }} to={`/perfil/${usuario.id}`} onClick={onClose}>
            <div className="d-flex align-items-center">
              <img
                src={usuario.fotoPerfil}
                alt="Foto de perfil do usuário"
                className="user-profile-picture rounded-circle"
                style={{ marginRight: '.5rem' }}
              />
              <p>{usuario.nome}</p>
            </div>
          </Link>
          {usuario.id !== me.id && (
            <FollowButton
              userId={usuario.id}
              following={seguindoIds.includes(usuario.id)}
              onChange={onFollowChange}
            />
          )}
        </div>
      ))}
    </Modal>
  );
}
