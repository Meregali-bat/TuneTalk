import { useEffect, useRef, useState } from 'react';

// pinned: undefined quando o post não pode ser fixado (não é do usuário ou é comentário).
export function PostMenu({ isOwner, onDelete, pinned, onTogglePin }) {
  const [open, setOpen] = useState(false);
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
    </div>
  );
}
