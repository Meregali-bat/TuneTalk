import { useEffect, useRef, useState } from 'react';

export function PostMenu({ isOwner, onDelete }) {
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
    <div className="dropdown" ref={ref}>
      <button
        type="button"
        className="btn p-0 border-0"
        style={{ color: '#fff' }}
        aria-label="Opções do post"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <i className="bi bi-three-dots-vertical" />
      </button>
      {open && (
        <ul className="dropdown-menu dropdown-menu-end show" role="menu" style={{ right: 0 }}>
          <li>
            {isOwner ? (
              <button type="button" role="menuitem" className="dropdown-item" onClick={() => select(onDelete)}>
                Deletar
              </button>
            ) : (
              <button type="button" role="menuitem" className="dropdown-item" onClick={() => select()}>
                Denunciar
              </button>
            )}
          </li>
        </ul>
      )}
    </div>
  );
}
