import { useState } from 'react';
import { usersApi } from '../../api/index.js';

/**
 * Seguir / Seguindo. Passando o mouse (ou com foco do teclado) em "Seguindo", o botão mostra
 * "Deixar de seguir" em vermelho, para ninguém deixar de seguir sem perceber.
 * Se a ação falhar, o botão diz isso e deixa tentar de novo.
 */
export function FollowButton({ userId, following, onChange, size = 'md' }) {
  const [pending, setPending] = useState(false);
  const [falhou, setFalhou] = useState(false);

  const toggle = async () => {
    setPending(true);
    setFalhou(false);
    try {
      if (following) await usersApi.unfollow(userId);
      else await usersApi.follow(userId);
      onChange?.(!following);
    } catch {
      setFalhou(true);
    } finally {
      setPending(false);
    }
  };

  const texto = following ? 'Seguindo' : 'Seguir';
  return (
    <>
      <button
        type="button"
        className={`follow-button follow-button--${size}${following ? ' is-following' : ''}${falhou ? ' is-error' : ''}`}
        data-acao={following ? 'Deixar de seguir' : undefined}
        disabled={pending}
        onClick={toggle}
      >
        <span className="follow-button__texto">{falhou ? 'Tentar de novo' : texto}</span>
      </button>
      {falhou && (
        <span role="alert" className="visually-hidden">
          {following ? 'Não deu para deixar de seguir.' : 'Não deu para seguir.'} Tente de novo.
        </span>
      )}
    </>
  );
}
