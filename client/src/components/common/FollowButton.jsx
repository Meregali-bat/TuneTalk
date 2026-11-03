import { useState } from 'react';
import { usersApi } from '../../api/index.js';

export function FollowButton({ userId, following, onChange, size = 'md' }) {
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
      className={`follow-button follow-button--${size}${following ? ' is-following' : ''}`}
      aria-pressed={following}
      disabled={pending}
      onClick={toggle}
    >
      {following ? 'Seguindo' : 'Seguir'}
    </button>
  );
}
