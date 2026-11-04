import { useEffect, useState } from 'react';
import { usersApi } from '../../api/index.js';

/**
 * Seguir / Seguindo. Deixar de seguir pede dois toques: o primeiro troca o botão para
 * "Deixar de seguir?" (em vermelho) por alguns segundos; só o segundo confirma.
 * Assim ninguém deixa de seguir sem querer, nem no celular.
 */
export function FollowButton({ userId, following, onChange, size = 'md' }) {
  const [pending, setPending] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (!confirmando) return undefined;
    const voltar = setTimeout(() => setConfirmando(false), 6000);
    return () => clearTimeout(voltar);
  }, [confirmando]);

  const toggle = async () => {
    if (following && !confirmando) {
      setConfirmando(true);
      return;
    }
    setConfirmando(false);
    setPending(true);
    try {
      if (following) await usersApi.unfollow(userId);
      else await usersApi.follow(userId);
      onChange?.(!following);
    } finally {
      setPending(false);
    }
  };

  let texto = following ? 'Seguindo' : 'Seguir';
  if (confirmando) texto = 'Deixar de seguir?';

  return (
    <button
      type="button"
      className={`follow-button follow-button--${size}${following ? ' is-following' : ''}${confirmando ? ' is-confirming' : ''}`}
      aria-pressed={following}
      disabled={pending}
      onClick={toggle}
      onBlur={() => setConfirmando(false)}
    >
      {texto}
    </button>
  );
}
