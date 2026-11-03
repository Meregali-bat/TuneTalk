import { useState } from 'react';
import { usersApi } from '../../api/index.js';
import { Modal } from '../common/Modal.jsx';
import { PasswordInput } from '../common/PasswordInput.jsx';
import { Field, RuleChecklist } from '../auth/AuthCard.jsx';
import { PASSWORD_RULES, checkPassword, isPasswordValid } from '../../../../shared/passwordRules.js';

export function ChangePasswordModal({ open, onClose, onChanged }) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const differ = repetir.length > 0 && repetir !== novaSenha;
  const canSave = !saving && senhaAtual.length > 0 && isPasswordValid(novaSenha) && repetir === novaSenha;

  const submit = async (event) => {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      await usersApi.changePassword(senhaAtual, novaSenha);
      onChanged();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Trocar senha" onClose={onClose} variant="sheet">
      <form className="edit-profile change-password" onSubmit={submit}>
        <Field label="Senha atual">
          {(props) => (
            <PasswordInput {...props} autoComplete="current-password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} />
          )}
        </Field>

        <Field label="Nova senha">
          {(props) => (
            <PasswordInput {...props} autoComplete="new-password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
          )}
        </Field>
        <RuleChecklist rules={PASSWORD_RULES} status={checkPassword(novaSenha)} label="Regras da senha" />

        <Field label="Repita a nova senha" error={differ ? 'As senhas não são iguais.' : ''}>
          {(props) => (
            <PasswordInput {...props} autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} />
          )}
        </Field>

        {error && <p role="alert" className="composer-error">{error}</p>}

        <div className="edit-profile__actions">
          <button type="button" className="composer-link" onClick={onClose}>Cancelar</button>
          <button type="submit" className="composer-submit" disabled={!canSave}>
            {saving ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
