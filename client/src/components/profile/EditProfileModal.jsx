import { useEffect, useId, useRef, useState } from 'react';
import { usersApi } from '../../api/index.js';
import { Modal } from '../common/Modal.jsx';
import { USERNAME_MESSAGES, checkUsername } from '../../../../shared/usernameRules.js';
import { IMAGEM_MAX_MB } from '../../api/limits.js';

const BIO_MAX = 255;
const NOME_EXIBICAO_MAX = 50;

// Escolha de imagem com prévia; recusa na hora o que passa do limite do Cloudinary.
function useImagePick(rotulo, setError) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const choose = (chosen) => {
    if (!chosen) return;
    if (chosen.size > IMAGEM_MAX_MB * 1024 * 1024) {
      setError(`${rotulo} pode ter no máximo ${IMAGEM_MAX_MB} MB.`);
      return;
    }
    setError('');
    setFile(chosen);
  };

  return { file, preview, choose };
}

// Nomes antigos fora das regras atuais continuam valendo enquanto não forem trocados.
function usernameProblem(nome, original) {
  if (nome === original) return '';
  const broken = Object.entries(checkUsername(nome)).find(([, ok]) => !ok);
  return broken ? USERNAME_MESSAGES[broken[0]] : '';
}

export function EditProfileModal({ open, usuario, onClose, onSaved, onChangePassword }) {
  const nomeId = useId();
  const exibicaoId = useId();
  const bioId = useId();
  const [nome, setNome] = useState(usuario.nome ?? '');
  const [nomeExibicao, setNomeExibicao] = useState(usuario.nomeExibicao ?? '');
  const [bio, setBio] = useState(usuario.bio ?? '');
  const [mostrarSelo, setMostrarSelo] = useState(usuario.mostrarSeloFundador !== false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(null); // null, 'foto', 'capa' ou 'dados'
  const foto = useImagePick('A foto', setError);
  const capa = useImagePick('A capa', setError);
  const fileInput = useRef(null);
  const capaInput = useRef(null);

  const problem = usernameProblem(nome.trim(), usuario.nome);
  const capaAtual = capa.preview ?? usuario.bannerUrl;

  // Como no editor de favoritos: fechar (ou ir trocar a senha) com mudanças não salvas pergunta antes.
  const alterado = nome !== (usuario.nome ?? '') || nomeExibicao !== (usuario.nomeExibicao ?? '')
    || bio !== (usuario.bio ?? '') || mostrarSelo !== (usuario.mostrarSeloFundador !== false)
    || Boolean(foto.file) || Boolean(capa.file);
  const podeSair = () => !alterado || window.confirm('Descartar as mudanças no perfil?');
  const fechar = () => { if (podeSair()) onClose(); };
  const irTrocarSenha = () => { if (podeSair()) onChangePassword(); };

  const submit = async (event) => {
    event.preventDefault();
    if (problem) return;
    setError('');
    try {
      const changes = { nome: nome.trim(), nomeExibicao: nomeExibicao.trim(), bio };
      if (usuario.fundadorDesde) changes.mostrarSeloFundador = mostrarSelo;
      if (foto.file) {
        setSaving('foto');
        changes.fotoPerfil = await usersApi.uploadPhoto(foto.file);
      }
      if (capa.file) {
        setSaving('capa');
        changes.bannerUrl = await usersApi.uploadBanner(capa.file);
      }
      setSaving('dados');
      onSaved(await usersApi.updateMe(changes));
    } catch (err) {
      setError(err.message);
      setSaving(null);
    }
  };

  return (
    <Modal open={open} title="Editar perfil" onClose={fechar} variant="sheet">
      <form className="edit-profile" onSubmit={submit}>
        <div className="edit-profile__banner">
          {capaAtual
            ? <img src={capaAtual} alt="Capa do perfil" className="profile-banner" />
            : <div className="profile-banner profile-banner--padrao" aria-hidden="true" />}
          <button type="button" className="composer-link edit-profile__banner-button" onClick={() => capaInput.current?.click()}>
            <i className="bi bi-image" aria-hidden="true" /> Trocar capa
          </button>
          <input
            ref={capaInput}
            type="file"
            accept="image/*"
            aria-label="Escolher capa"
            className="visually-hidden"
            tabIndex={-1}
            onChange={(event) => capa.choose(event.target.files[0])}
          />
        </div>

        <div className="edit-profile__photo">
          <img src={foto.preview ?? usuario.fotoPerfil} alt="Foto de perfil" className="edit-profile__avatar" />
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
            onChange={(event) => foto.choose(event.target.files[0])}
          />
        </div>

        <div className="composer-field">
          <label htmlFor={exibicaoId}>Nome</label>
          <input
            id={exibicaoId}
            type="text"
            className="edit-profile__input"
            maxLength={NOME_EXIBICAO_MAX}
            placeholder="Como você quer aparecer (ex.: Ana Souza)"
            value={nomeExibicao}
            onChange={(event) => setNomeExibicao(event.target.value)}
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

        {usuario.fundadorDesde && (
          <label className="edit-profile__toggle">
            <input type="checkbox" checked={mostrarSelo} onChange={(event) => setMostrarSelo(event.target.checked)} />
            <span>
              <i className="bi bi-award-fill founder-badge" aria-hidden="true" /> Mostrar selo de fundador no meu perfil
            </span>
          </label>
        )}

        {onChangePassword && (
          <div className="edit-profile__conta">
            <span>Conta</span>
            <button type="button" className="composer-link" onClick={irTrocarSenha}>
              <i className="bi bi-key" aria-hidden="true" /> Trocar senha
            </button>
          </div>
        )}

        {error && <p role="alert" className="composer-error">{error}</p>}

        <div className="edit-profile__actions">
          <button type="button" className="composer-link" onClick={fechar}>Cancelar</button>
          <button type="submit" className="composer-submit" disabled={Boolean(saving) || Boolean(problem)}>
            {{ foto: 'Enviando foto…', capa: 'Enviando capa…', dados: 'Salvando…' }[saving] ?? 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
