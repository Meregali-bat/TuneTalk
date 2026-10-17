import { useState } from 'react';

export function PasswordInput(props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-container mb-3">
      <input {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        style={{ background: 'none', margin: 0, color: '#000' }}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        onClick={() => setVisible((v) => !v)}
      >
        <i className={visible ? 'bi bi-eye' : 'bi bi-eye-slash'} />
      </button>
    </div>
  );
}
