import { useState } from 'react';
import { usersApi } from '../../api/index.js';

export function FollowButton({ userId, following, onChange }) {
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    setPending(true);
    try {
      if (following) await usersApi.unfollow(userId);
      else await usersApi.follow(userId);
      onChange?.(!following);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      className={following ? 'botao-seguindo' : 'botao-seguir'}
      disabled={pending}
      onClick={toggle}
    >
      <span>{following ? 'Seguindo' : 'Seguir'}</span>
    </button>
  );
}
