import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { AuthCard, Field, FormError, RuleChecklist } from '../components/auth/AuthCard.jsx';
import { PasswordInput } from '../components/common/PasswordInput.jsx';
import { PASSWORD_RULES, checkPassword, isPasswordValid } from '../../../shared/passwordRules.js';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const passwordsDiffer = confirmacao !== '' && senha !== confirmacao;
  const canSubmit = email.trim() !== '' && isPasswordValid(senha) && senha === confirmacao && !sending;

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSending(true);
    setError('');
    try {
      await register({ email, senha });
      navigate('/bem-vindo');
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  return (
    <AuthCard
      title="Crie sua conta"
      subtitle="Só precisa de email e senha. O nome de usuário você escolhe em seguida."
      footer={<>Já tem conta? <Link to="/login">Entrar</Link></>}
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
              autoComplete="new-password"
              required
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
            />
          )}
        </Field>
        <RuleChecklist rules={PASSWORD_RULES} status={checkPassword(senha)} label="Regras da senha" />
        <Field label="Confirmar senha" error={passwordsDiffer ? 'As senhas não são iguais.' : ''}>
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="new-password"
              required
              value={confirmacao}
              onChange={(event) => setConfirmacao(event.target.value)}
            />
          )}
        </Field>
        <button type="submit" className="auth-submit" disabled={!canSubmit}>
          {sending ? 'Criando conta…' : 'Criar conta'}
        </button>
      </form>
    </AuthCard>
  );
}
