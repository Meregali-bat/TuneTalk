import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authApi } from '../api/index.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { AuthCard, Field, FormError, RuleChecklist } from '../components/auth/AuthCard.jsx';
import { PasswordInput } from '../components/common/PasswordInput.jsx';
import { PASSWORD_RULES, checkPassword, isPasswordValid } from '../../../shared/passwordRules.js';

// O código vem depois do "#" no link do email (#token=...), que o navegador não envia a outros sites.
const tokenFrom = (hash) => new URLSearchParams(hash.replace(/^#/, '')).get('token');

const pedirOutro = <Link to="/esqueci-senha">Pedir outro link</Link>;

export function ResetPasswordPage() {
  const { hash } = useLocation();
  const { user, logout } = useAuth();
  const token = tokenFrom(hash);
  const [novaSenha, setNovaSenha] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const differ = repetir.length > 0 && repetir !== novaSenha;
  const canSave = !saving && isPasswordValid(novaSenha) && repetir === novaSenha;

  const submit = async (event) => {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      await authApi.resetPassword(token, novaSenha);
      // O servidor derruba todas as sessões da conta; se havia alguém logado aqui, sai também.
      if (user) await logout();
      setDone(true);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (!token) {
    return (
      <AuthCard title="Link incompleto" footer={pedirOutro}>
        <p className="auth-notice">Este endereço está incompleto. Abra o link do email de novo ou peça outro.</p>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard title="Senha nova salva!" subtitle="Agora é só entrar com ela. Por segurança, todos os aparelhos saíram da conta.">
        <Link to="/login" className="auth-submit auth-submit--link">Entrar</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Crie uma senha nova" footer={error ? pedirOutro : null}>
      <form className="auth-form-fields" onSubmit={submit} noValidate>
        <FormError message={error} />
        <Field label="Nova senha">
          {(props) => (
            <PasswordInput {...props} autoComplete="new-password" required value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
          )}
        </Field>
        <RuleChecklist rules={PASSWORD_RULES} status={checkPassword(novaSenha)} label="Regras da senha" />
        <Field label="Repita a nova senha" error={differ ? 'As senhas não são iguais.' : ''}>
          {(props) => (
            <PasswordInput {...props} autoComplete="new-password" required value={repetir} onChange={(e) => setRepetir(e.target.value)} />
          )}
        </Field>
        <button type="submit" className="auth-submit" disabled={!canSave}>
          {saving ? 'Salvando…' : 'Salvar nova senha'}
        </button>
      </form>
    </AuthCard>
  );
}
