import { useEffect, useState } from 'react';
import { usersApi } from '../../api/index.js';

/**
 * Seguir / Seguindo. Deixar de seguir pede dois toques: o primeiro troca o botão para
 * "Deixar de seguir?" (em vermelho) por alguns segundos; só o segundo confirma.
 * Assim ninguém deixa de seguir sem querer, nem no celular (onde não existe "passar o mouse").
 * Se a ação falhar, o botão diz isso e deixa tentar de novo.
 */
export function FollowButton({ userId, following, onChange, size = 'md' }) {
  const [pending, setPending] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (!confirmando) return undefined;
    const voltar = setTimeout(() => setConfirmando(false), 4000);
    return () => clearTimeout(voltar);
  }, [confirmando]);

  const toggle = async () => {
    if (following && !confirmando) {
      setConfirmando(true);
      return;
    }
    setConfirmando(false);
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

  let texto = following ? 'Seguindo' : 'Seguir';
  if (confirmando) texto = 'Deixar de seguir?';
  if (falhou) texto = 'Tentar de novo';

  return (
    <>
      <button
        type="button"
        className={`follow-button follow-button--${size}${following ? ' is-following' : ''}${confirmando || falhou ? ' is-error' : ''}`}
        aria-pressed={following}
        disabled={pending}
        onClick={toggle}
        onBlur={() => setConfirmando(false)}
      >
        {following && !confirmando && !falhou && <i className="bi bi-check2 follow-button__check" aria-hidden="true" />}
        {texto}
      </button>
      {confirmando && (
        <span role="status" className="visually-hidden">Toque de novo para deixar de seguir.</span>
      )}
      {falhou && (
        <span role="alert" className="visually-hidden">
          {following ? 'Não deu para deixar de seguir.' : 'Não deu para seguir.'} Tente de novo.
        </span>
      )}
    </>
  );
}
