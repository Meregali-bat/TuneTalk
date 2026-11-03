import { useEffect, useId, useRef } from 'react';
import { useVisualViewportVars } from '../../hooks/useVisualViewport.js';

// variant "panel": painel ancorado no canto superior direito (notificações); no celular ocupa a largura.
// variant "sheet": no celular ocupa a tela a partir do topo e encolhe para caber acima do teclado.
export function Modal({ open, title, onClose, children, centered = false, variant = 'dialog' }) {
  const titleId = useId();
  const contentRef = useRef(null);

  // Foco: ao abrir, entra na janela (se nenhum campo com autoFocus já pegou); Tab fica preso dentro dela;
  // ao fechar, volta para o que estava focado antes (ex.: o botão que abriu).
  useEffect(() => {
    if (!open) return undefined;
    const anterior = document.activeElement;
    const content = contentRef.current;
    if (content && !content.contains(document.activeElement)) content.focus({ preventScroll: true });
    const prender = (event) => {
      if (event.key !== 'Tab' || !content) return;
      const focaveis = [...content.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((el) => !el.closest('[hidden]'));
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (event.shiftKey && (document.activeElement === primeiro || document.activeElement === content)) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener('keydown', prender);
    return () => {
      document.removeEventListener('keydown', prender);
      if (anterior instanceof HTMLElement && document.contains(anterior)) anterior.focus({ preventScroll: true });
    };
  }, [open]);

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
          <div ref={contentRef} tabIndex={-1} className="modal-content" role="dialog" aria-modal="true" aria-labelledby={titleId}>
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
