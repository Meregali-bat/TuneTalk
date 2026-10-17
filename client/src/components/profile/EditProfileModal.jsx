import { useEffect, useRef, useState } from 'react';
import { usersApi } from '../../api/index.js';

export function EditProfileModal({ open, usuario, onClose, onSaved }) {
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

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData();
    form.append('nome', nome);
    form.append('bio', bio);
    if (foto) form.append('foto', foto);

    setSaving(true);
    setError('');
    try {
      onSaved(await usersApi.updateMe(form));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div id="overlay" style={{ display: 'block', position: 'fixed', width: '100%', height: '100%', top: 0, left: 0, background: 'rgba(0, 0, 0, 0.5)' }} onClick={onClose} />
      <div id="popup" style={{ display: 'block' }}>
        <form onSubmit={submit}>
          <div className="row d-flex">
            <div className="header-editar-perfil">
              <div>
                <button type="button" aria-label="Fechar edição" style={{ background: 'none', border: 'none', color: 'inherit' }} onClick={onClose}>
                  <i style={{ cursor: 'pointer', fontSize: '1.2rem' }} className="bi bi-x-lg" />
                </button>
                <span>Editar perfil</span>
              </div>
              <button id="btn-salvar-edicao" type="submit" disabled={saving}>Salvar</button>
            </div>
            <div className="img-inputs">
              <img
                className="profile-picture"
                src={preview ?? usuario.fotoPerfil}
                alt="Foto de perfil"
                style={{ cursor: 'pointer' }}
                onClick={() => fileInput.current?.click()}
              />
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                aria-label="Escolher foto"
                style={{ display: 'none' }}
                onChange={(event) => setFoto(event.target.files[0] ?? null)}
              />
              <div className="editar-perfil-inputs">
                {error && <div role="alert" className="alert m-0">{error}</div>}
                <input type="text" id="nome" aria-label="Nome" value={nome} onChange={(event) => setNome(event.target.value)} />
                <input type="text" id="bio" aria-label="Bio" value={bio} onChange={(event) => setBio(event.target.value)} />
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
