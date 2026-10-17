import { useEffect, useId } from 'react';

export function Modal({ open, title, onClose, children, centered = false }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="modal-backdrop fade show" />
      <div
        className="modal fade show d-block"
        data-testid="modal-backdrop"
        onClick={(event) => event.target === event.currentTarget && onClose()}
      >
        <div className={`modal-dialog${centered ? ' modal-dialog-centered' : ''}`}>
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="modal-header">
              <h5 className="modal-title" id={titleId}>{title}</h5>
              <button type="button" className="botao-seguindo" style={{ border: 'none' }} aria-label="Fechar" onClick={onClose}>
                <i style={{ cursor: 'pointer', fontSize: '1.2rem' }} className="bi bi-x-lg" />
              </button>
            </div>
            <div className="modal-body">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}
