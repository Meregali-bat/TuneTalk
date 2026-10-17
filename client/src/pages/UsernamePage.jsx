import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { usersApi } from '../api/index.js';
import { AuthCard, Field, FormError, RuleChecklist } from '../components/auth/AuthCard.jsx';
import { USERNAME_RULES, checkUsername } from '../../../shared/usernameRules.js';

// Passo obrigatório depois do primeiro login: a conta nasce sem nome de usuário.
export function UsernamePage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (user.nome) return <Navigate to="/foryou" replace />;

  const status = checkUsername(nome.trim());
  const canSubmit = Object.values(status).every(Boolean) && !sending;

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSending(true);
    setError('');
    try {
      const saved = await usersApi.setUsername(nome.trim());
      updateUser({ nome: saved.nome });
      navigate('/foryou');
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  const leave = async () => {
    await logout();
    navigate('/');
  };

  return (
    <AuthCard
      title="Escolha seu nome de usuário"
      subtitle={`É assim que as pessoas vão te encontrar no TuneTalk. Conta: ${user.email}`}
      footer={<>Não é você? <button type="button" className="auth-link-button" onClick={leave}>Sair</button></>}
    >
      <form className="auth-form-fields" onSubmit={submit} noValidate>
        <FormError message={error} />
        <Field label="Nome de usuário">
          {(props) => (
            <div className="username-field">
              <span aria-hidden="true">@</span>
              <input
                {...props}
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck="false"
                placeholder="seu.nome"
                maxLength={30}
                value={nome}
                onChange={(event) => setNome(event.target.value)}
              />
            </div>
          )}
        </Field>
        <RuleChecklist rules={USERNAME_RULES} status={status} label="Regras do nome de usuário" />
        <button type="submit" className="auth-submit" disabled={!canSubmit}>
          {sending ? 'Salvando…' : 'Continuar'}
        </button>
      </form>
    </AuthCard>
  );
}
