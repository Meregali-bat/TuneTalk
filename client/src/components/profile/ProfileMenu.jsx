import { useEffect, useRef, useState } from 'react';
import { usersApi } from '../../api/index.js';
import { ConfirmarBloqueio } from '../common/ConfirmarBloqueio.jsx';

/** "⋯" no perfil de outra pessoa: silenciar e bloquear (ou desfazer). onMudou recarrega o perfil. */
export function ProfileMenu({ usuario, relacao, onMudou }) {
  const [open, setOpen] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const fecharFora = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', fecharFora);
    return () => document.removeEventListener('mousedown', fecharFora);
  }, [open]);

  const executar = async (acao) => {
    setOpen(false);
    try {
      await acao(usuario.id);
      onMudou();
    } catch {
      // Sem rede: nada mudou, dá para tentar de novo.
    }
  };

  const bloquear = async () => {
    await usersApi.bloquear(usuario.id);
    setConfirmando(false);
    onMudou();
  };

  return (
    <div className="post-menu" ref={ref}>
      <button
        type="button"
        className="follow-button follow-button--md is-following profile-menu__botao"
        aria-label="Mais opções"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <i className="bi bi-three-dots" aria-hidden="true" />
      </button>
      {open && (
        <ul className="post-menu__list" role="menu">
          {!relacao.bloqueado && (
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className="post-menu__item"
                onClick={() => executar(relacao.silenciado ? usersApi.dessilenciar : usersApi.silenciar)}
              >
                <i className={relacao.silenciado ? 'bi bi-volume-up' : 'bi bi-volume-mute'} aria-hidden="true" />
                {relacao.silenciado ? ` Deixar de silenciar @${usuario.nome}` : ` Silenciar @${usuario.nome}`}
              </button>
            </li>
          )}
          <li role="none">
            {relacao.bloqueado ? (
              <button type="button" role="menuitem" className="post-menu__item" onClick={() => executar(usersApi.desbloquear)}>
                <i className="bi bi-slash-circle" aria-hidden="true" /> Desbloquear @{usuario.nome}
              </button>
            ) : (
              <button
                type="button"
                role="menuitem"
                className="post-menu__item is-danger"
                onClick={() => { setOpen(false); setConfirmando(true); }}
              >
                <i className="bi bi-slash-circle" aria-hidden="true" /> Bloquear @{usuario.nome}
              </button>
            )}
          </li>
        </ul>
      )}
      {confirmando && <ConfirmarBloqueio usuario={usuario} onClose={() => setConfirmando(false)} onConfirmar={bloquear} />}
    </div>
  );
}
