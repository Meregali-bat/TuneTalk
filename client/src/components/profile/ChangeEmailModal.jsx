import { useState } from 'react';
import { usersApi } from '../../api/index.js';
import { Modal } from '../common/Modal.jsx';
import { PasswordInput } from '../common/PasswordInput.jsx';
import { Field } from '../auth/AuthCard.jsx';
import { emailValido, limparEmail } from '../../../../shared/emailRules.js';

/** Troca o email de login. Pede a senha atual. */
export function ChangeEmailModal({ open, emailAtual, onClose, onChanged }) {
  const [novoEmail, setNovoEmail] = useState('');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const limpo = limparEmail(novoEmail);
  const invalido = novoEmail.trim().length > 0 && !emailValido(novoEmail);
  const igual = limpo.length > 0 && limpo === limparEmail(emailAtual);
  let aviso = '';
  if (invalido) aviso = 'Informe um email válido.';
  else if (igual) aviso = 'Esse já é o seu email.';
  const canSave = !saving && senhaAtual.length > 0 && emailValido(novoEmail) && !igual;

  const submit = async (event) => {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      const { email } = await usersApi.changeEmail(senhaAtual, limpo);
      onChanged(email);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Trocar email" onClose={onClose} variant="sheet">
      <form className="edit-profile change-password" onSubmit={submit}>
        {emailAtual && (
          <p className="composer-hint change-email__atual">
            Email atual: <strong>{emailAtual}</strong>
          </p>
        )}

        <Field label="Novo email" error={aviso}>
          {(props) => (
            <input
              {...props}
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck="false"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
            />
          )}
        </Field>

        <Field label="Senha atual">
          {(props) => (
            <PasswordInput {...props} autoComplete="current-password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} />
          )}
        </Field>
        {/* TODO(email): com o envio de email funcionando em produção, voltar a dizer que o endereço
            antigo é avisado: "Você vai entrar com o novo email. Avisamos o endereço antigo sobre a
            troca." (o servidor já manda o aviso). Ver TODO.md. */}
        <p className="composer-hint">Depois da troca, você entra com o novo email.</p>

        {error && <p role="alert" className="composer-error">{error}</p>}

        <div className="edit-profile__actions">
          <button type="button" className="composer-link" onClick={onClose}>Cancelar</button>
          <button type="submit" className="composer-submit" disabled={!canSave}>
            {saving ? 'Salvando…' : 'Salvar novo email'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
