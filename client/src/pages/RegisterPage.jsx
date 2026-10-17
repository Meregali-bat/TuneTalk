import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { Alert } from '../components/common/Alert.jsx';
import { PasswordInput } from '../components/common/PasswordInput.jsx';
import { checkPassword } from '../../../shared/passwordRules.js';

const RULES = [
  ['length', 'ruleLength', 'A senha deve conter no mínimo 6 caracteres.'],
  ['uppercase', 'ruleUppercase', 'A senha deve conter uma letra maiúscula.'],
  ['symbol', 'ruleSymbol', 'A senha deve conter um símbolo.'],
];

function ProfilePhotoPicker({ file, onChange }) {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <label htmlFor="container__central__form__imagem" id="container__central__form__label">
      {!preview && <i id="icone" className="bi bi-person-fill" />}
      <span className="picture__img">
        {preview && <img src={preview} alt="Prévia da foto de perfil" className="picture__img" />}
      </span>
      <input
        type="file"
        accept="image/*"
        id="container__central__form__imagem"
        aria-label="Foto de perfil"
        onChange={(event) => onChange(event.target.files[0] ?? null)}
      />
    </label>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fields, setFields] = useState({ nome: '', email: '', senha: '', confirmarSenha: '' });
  const [imagem, setImagem] = useState(null);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  const rules = checkPassword(fields.senha);
  const passwordsDiffer = fields.confirmarSenha !== '' && fields.senha !== fields.confirmarSenha;

  const update = (name) => (event) => setFields((f) => ({ ...f, [name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (fields.senha !== fields.confirmarSenha) return;

    const form = new FormData();
    form.append('nome', fields.nome);
    form.append('email', fields.email);
    form.append('senha', fields.senha);
    if (imagem) form.append('imagem', imagem);

    setSending(true);
    try {
      await register(form);
      navigate('/foryou');
    } catch (err) {
      setError({ message: err.message, id: Date.now() });
      setSending(false);
    }
  };

  return (
    <>
      {error && <Alert key={error.id} message={error.message} />}
      <form id="container__central__form" onSubmit={submit}>
        <ProfilePhotoPicker file={imagem} onChange={setImagem} />
        <div className="nome-container mb-3">
          <input type="text" className="container__central__form__nome" placeholder="seu nome" required value={fields.nome} onChange={update('nome')} />
        </div>
        <div className="email-container mb-3">
          <input type="email" className="container__central__form__email" id="email" placeholder="exemplo@gmail.com" required value={fields.email} onChange={update('email')} />
        </div>
        <PasswordInput id="container__central__form__senha" placeholder="Senha" required value={fields.senha} onChange={update('senha')} />
        {RULES.filter(([key]) => !rules[key]).map(([key, id, text]) => (
          <small key={key} id={id} style={{ color: '#4e4e4e', display: 'block' }}>{text}</small>
        ))}
        <PasswordInput id="container__central__form__confirmarSenha" placeholder="Confirmar Senha" required value={fields.confirmarSenha} onChange={update('confirmarSenha')} />
        <small id="passwordError" style={{ color: '#ff0000' }}>{passwordsDiffer ? 'Senhas diferentes.' : ''}</small>
        <button type="submit" id="container__central__form__button" disabled={sending}>Criar conta</button>
        <p className="novoUsuario">
          já tem uma conta? <Link className="novoUsuario" to="/login">Faça login aqui</Link>
        </p>
      </form>
    </>
  );
}
