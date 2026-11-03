import { useEffect, useId, useRef, useState } from 'react';
import { usersApi } from '../../api/index.js';
import { Modal } from '../common/Modal.jsx';
import { USERNAME_MESSAGES, checkUsername } from '../../../../shared/usernameRules.js';
import { IMAGEM_MAX_MB } from '../../api/limits.js';

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
  const [saving, setSaving] = useState(null); // null, 'foto' ou 'dados'
  const fileInput = useRef(null);

  useEffect(() => {
    if (!foto) return undefined;
    const url = URL.createObjectURL(foto);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  const problem = usernameProblem(nome.trim(), usuario.nome);

  const chooseFoto = (file) => {
    if (!file) return;
    if (file.size > IMAGEM_MAX_MB * 1024 * 1024) {
      setError(`A foto pode ter no máximo ${IMAGEM_MAX_MB} MB.`);
      return;
    }
    setError('');
    setFoto(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (problem) return;
    setError('');
    try {
      const changes = { nome: nome.trim(), bio };
      if (foto) {
        setSaving('foto');
        changes.fotoPerfil = await usersApi.uploadPhoto(foto);
      }
      setSaving('dados');
      onSaved(await usersApi.updateMe(changes));
    } catch (err) {
      setError(err.message);
      setSaving(null);
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
            onChange={(event) => chooseFoto(event.target.files[0])}
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
          <button type="submit" className="composer-submit" disabled={Boolean(saving) || Boolean(problem)}>
            {{ foto: 'Enviando foto…', dados: 'Salvando…' }[saving] ?? 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
