import { useEffect, useId } from 'react';
import { useVisualViewportVars } from '../../hooks/useVisualViewport.js';

// variant "panel": painel ancorado no canto superior direito (notificações); no celular ocupa a largura.
// variant "sheet": no celular ocupa a tela a partir do topo e encolhe para caber acima do teclado.
export function Modal({ open, title, onClose, children, centered = false, variant = 'dialog' }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  // Trava a rolagem da página de trás (classe do Bootstrap: overflow hidden no body).
  useEffect(() => {
    if (!open) return undefined;
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, [open]);

  useVisualViewportVars(open && variant === 'sheet');

  if (!open) return null;

  const dialogClass = ['modal-dialog', 'app-modal', `app-modal--${variant}`, centered && 'modal-dialog-centered']
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div className="modal-backdrop fade show" />
      <div
        className="modal fade show d-block"
        data-testid="modal-backdrop"
        onClick={(event) => event.target === event.currentTarget && onClose()}
      >
        <div className={dialogClass}>
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="modal-header">
              <h2 className="modal-title" id={titleId}>{title}</h2>
              <button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}>
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </div>
            <div className="modal-body">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}
