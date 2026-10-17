import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { homeFor } from '../auth/guards.jsx';
import { AuthCard, Field, FormError } from '../components/auth/AuthCard.jsx';
import { PasswordInput } from '../components/common/PasswordInput.jsx';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      const user = await login(email, senha);
      navigate(homeFor(user));
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  return (
    <AuthCard
      title="Bem-vindo de volta"
      subtitle="Entre para ver o que a galera anda ouvindo."
      footer={<>Ainda não tem conta? <Link to="/cadastrar">Criar conta</Link></>}
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
        <Field label="Senha">
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="current-password"
              required
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
            />
          )}
        </Field>
        <button type="submit" className="auth-submit" disabled={sending || !email || !senha}>
          {sending ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </AuthCard>
  );
}
