import { useEffect, useId, useRef, useState } from 'react';
import { usersApi } from '../../api/index.js';
import { Modal } from '../common/Modal.jsx';
import { USERNAME_MESSAGES, checkUsername } from '../../../../shared/usernameRules.js';

const BIO_MAX = 255;

// Nomes antigos fora das regras atuais continuam valendo enquanto não forem trocados.
function usernameProblem(nome, original) {
  if (nome === original) return '';
  const broken = Object.entries(checkUsername(nome)).find(([, ok]) => !ok);
  return broken ? USERNAME_MESSAGES[broken[0]] : '';
}

export function EditProfileModal({ open, usuario, onClose, onSaved }) {
  const nomeId = useId();
  const bioId = useId();
  const [nome, setNome] = useState(usuario.nome ?? '');
  const [bio, setBio] = useState(usuario.bio ?? '');
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => {
    if (!foto) return undefined;
    const url = URL.createObjectURL(foto);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  const problem = usernameProblem(nome.trim(), usuario.nome);

  const submit = async (event) => {
    event.preventDefault();
    if (problem) return;
    const form = new FormData();
    form.append('nome', nome.trim());
    form.append('bio', bio);
    if (foto) form.append('foto', foto);

    setSaving(true);
    setError('');
    try {
      onSaved(await usersApi.updateMe(form));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Editar perfil" onClose={onClose} variant="sheet">
      <form className="edit-profile" onSubmit={submit}>
        <div className="edit-profile__photo">
          <img src={preview ?? usuario.fotoPerfil} alt="Foto de perfil" className="edit-profile__avatar" />
          <button type="button" className="composer-link" onClick={() => fileInput.current?.click()}>
            <i className="bi bi-camera" aria-hidden="true" /> Trocar foto
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            aria-label="Trocar foto"
            className="visually-hidden"
            tabIndex={-1}
            onChange={(event) => setFoto(event.target.files[0] ?? null)}
          />
        </div>

        <div className="composer-field">
          <label htmlFor={nomeId}>Nome de usuário</label>
          <div className="username-field">
            <span aria-hidden="true">@</span>
            <input
              id={nomeId}
              type="text"
              autoCapitalize="none"
              spellCheck="false"
              maxLength={30}
              aria-invalid={problem ? true : undefined}
              aria-describedby={problem ? `${nomeId}-erro` : undefined}
              value={nome}
              onChange={(event) => setNome(event.target.value)}
            />
          </div>
          {problem && <p id={`${nomeId}-erro`} className="field-error">{problem}</p>}
        </div>

        <div className="composer-field">
          <label htmlFor={bioId}>Bio</label>
          <textarea
            id={bioId}
            rows={3}
            maxLength={BIO_MAX}
            placeholder="Conte o que você gosta de ouvir"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
          />
          <span className="composer-counter">{bio.length}/{BIO_MAX}</span>
        </div>

        {error && <p role="alert" className="composer-error">{error}</p>}

        <div className="edit-profile__actions">
          <button type="button" className="composer-link" onClick={onClose}>Cancelar</button>
          <button type="submit" className="composer-submit" disabled={saving || Boolean(problem)}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
