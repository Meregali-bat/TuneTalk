import { useId } from 'react';

export function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="auth-card">
      <h1 className="auth-title">
        {title}<span className="auth-title__dot">.</span>
      </h1>
      {subtitle && <p className="auth-subtitle">{subtitle}</p>}
      {children}
      {footer && <p className="auth-footer">{footer}</p>}
    </div>
  );
}

export function Field({ label, hint, error, children }) {
  const id = useId();
  const hintId = hint || error ? `${id}-hint` : undefined;
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-describedby': hintId, 'aria-invalid': error ? true : undefined })}
      {(error || hint) && (
        <p id={hintId} className={error ? 'auth-field__error' : 'auth-field__hint'}>{error || hint}</p>
      )}
    </div>
  );
}

// Lista de regras com o estado de cada uma escrito por extenso para leitores de tela.
export function RuleChecklist({ rules, status, label }) {
  return (
    <ul className="auth-rules" aria-label={label}>
      {rules.map(([key, text]) => (
        <li key={key} className={status[key] ? 'is-ok' : undefined}>
          <i className={status[key] ? 'bi bi-check-circle-fill' : 'bi bi-circle'} aria-hidden="true" />
          <span className="visually-hidden">{status[key] ? 'Cumprida: ' : 'Pendente: '}</span>
          {text}
        </li>
      ))}
    </ul>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return <p role="alert" className="auth-error"><i className="bi bi-exclamation-circle" aria-hidden="true" /> {message}</p>;
}
