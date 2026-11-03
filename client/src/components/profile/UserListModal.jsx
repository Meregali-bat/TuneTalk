import { Modal } from '../common/Modal.jsx';
import { UserRow } from './UserRow.jsx';

export function UserListModal({ open, title, users, seguindoIds, onClose, onFollowChange }) {
  return (
    <Modal open={open} title={title} onClose={onClose} variant="sheet">
      {users.length === 0 && <p className="notif-status">Ninguém por aqui ainda.</p>}
      {users.length > 0 && (
        <ul className="user-list">
          {users.map((usuario) => (
            <UserRow
              key={usuario.id}
              usuario={usuario}
              following={seguindoIds.includes(usuario.id)}
              onFollowChange={onFollowChange}
              onNavigate={onClose}
            />
          ))}
        </ul>
      )}
    </Modal>
  );
}
