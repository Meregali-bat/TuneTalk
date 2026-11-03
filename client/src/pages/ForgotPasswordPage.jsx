import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/index.js';
import { AuthCard, Field, FormError } from '../components/auth/AuthCard.jsx';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const clean = email.trim();
    if (!clean) return;
    setSending(true);
    setError('');
    try {
      await authApi.forgotPassword(clean);
      setSentTo(clean);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const footer = <Link to="/login">Voltar para o login</Link>;

  if (sentTo) {
    return (
      <AuthCard title="Confira seu email" footer={footer}>
        {/* Mesma resposta exista a conta ou não: a tela não revela quem tem cadastro. */}
        <p role="status" className="auth-notice">
          <i className="bi bi-envelope-check" aria-hidden="true" />
          <span>
            Se existir uma conta com {sentTo}, enviamos um link para criar uma senha nova. Ele vale por 1 hora.
            Confira também o spam.
          </span>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Esqueceu a senha?"
      subtitle="Informe o email da sua conta e mandamos um link para criar uma senha nova."
      footer={footer}
    >
      <form className="auth-form-fields" onSubmit={submit} noValidate>
        <FormError message={error} />
        <Field label="Email">
          {(props) => (
            <input
              {...props}
              type="email"
              autoComplete="email"
              placeholder="voce@email.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          )}
        </Field>
        <button type="submit" className="auth-submit" disabled={sending || !email.trim()}>
          {sending ? 'Enviando…' : 'Enviar link'}
        </button>
      </form>
    </AuthCard>
  );
}
