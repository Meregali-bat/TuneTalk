import { useState } from 'react';

export function PasswordInput(props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="password-field__toggle"
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        onClick={() => setVisible((v) => !v)}
      >
        <i className={visible ? 'bi bi-eye' : 'bi bi-eye-slash'} />
      </button>
    </div>
  );
}
