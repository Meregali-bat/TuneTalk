import { useEffect, useRef, useState } from 'react';
import { usersApi } from '../../api/index.js';
import { ConfirmarBloqueio } from '../common/ConfirmarBloqueio.jsx';

// pinned: undefined quando o post não pode ser fixado (não é do usuário ou é comentário).
// autor + onAutorOculto: no post de outra pessoa, silenciar ou bloquear quem postou; depois disso
// a lista some com os posts dela (onAutorOculto recebe o id).
export function PostMenu({ isOwner, onDelete, pinned, onTogglePin, autor, onAutorOculto }) {
  const [open, setOpen] = useState(false);
  const [confirmandoBloqueio, setConfirmandoBloqueio] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  const select = (action) => {
    setOpen(false);
    action?.();
  };

  const silenciar = async () => {
    setOpen(false);
    try {
      await usersApi.silenciar(autor.id);
      onAutorOculto?.(autor.id);
    } catch {
      // Sem rede: o post continua aí e dá para tentar de novo.
    }
  };

  const bloquear = async () => {
    await usersApi.bloquear(autor.id);
    setConfirmandoBloqueio(false);
    onAutorOculto?.(autor.id);
  };

  return (
    <div className="post-menu" ref={ref}>
      <button
        type="button"
        className="icon-button"
        aria-label="Opções do post"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <i className="bi bi-three-dots" aria-hidden="true" />
      </button>
      {open && (
        <ul className="post-menu__list" role="menu">
          {isOwner && pinned !== undefined && (
            <li role="none">
              <button type="button" role="menuitem" className="post-menu__item" onClick={() => select(onTogglePin)}>
                <i className={pinned ? 'bi bi-pin-angle' : 'bi bi-pin-angle-fill'} aria-hidden="true" />
                {pinned ? ' Desafixar do perfil' : ' Fixar no perfil'}
              </button>
            </li>
          )}
          {!isOwner && autor && (
            <>
              <li role="none">
                <button type="button" role="menuitem" className="post-menu__item" onClick={silenciar}>
                  <i className="bi bi-volume-mute" aria-hidden="true" /> Silenciar @{autor.nome}
                </button>
              </li>
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  className="post-menu__item"
                  onClick={() => select(() => setConfirmandoBloqueio(true))}
                >
                  <i className="bi bi-slash-circle" aria-hidden="true" /> Bloquear @{autor.nome}
                </button>
              </li>
            </>
          )}
          <li role="none">
            {isOwner ? (
              <button type="button" role="menuitem" className="post-menu__item is-danger" onClick={() => select(onDelete)}>
                <i className="bi bi-trash3" aria-hidden="true" /> Deletar
              </button>
            ) : (
              <button type="button" role="menuitem" className="post-menu__item" onClick={() => select()}>
                <i className="bi bi-flag" aria-hidden="true" /> Denunciar
              </button>
            )}
          </li>
        </ul>
      )}
      {confirmandoBloqueio && (
        <ConfirmarBloqueio usuario={autor} onClose={() => setConfirmandoBloqueio(false)} onConfirmar={bloquear} />
      )}
    </div>
  );
}
