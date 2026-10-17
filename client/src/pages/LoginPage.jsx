import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { Alert } from '../components/common/Alert.jsx';
import { PasswordInput } from '../components/common/PasswordInput.jsx';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    try {
      await login(email, senha);
      navigate('/foryou');
    } catch (err) {
      setError({ message: err.message, id: Date.now() });
      setSending(false);
    }
  };

  return (
    <>
      {error && <Alert key={error.id} message={error.message} />}
      <div className="login-container">
        <span className="login-welcome">
          {' '}Bem-vindo de volta<strong className="login-welcome">.</strong>
        </span>
        <form onSubmit={submit}>
          <div className="email-container mb-3">
            <input
              type="email"
              className="container__central__form__email"
              id="email"
              placeholder="exemplo@gmail.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <PasswordInput
            id="container__central__form__senha"
            placeholder="Senha"
            required
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
          />
          <button type="submit" className="btn-login" disabled={sending}>Login</button>
          <Link to="/cadastrar" className="novoUsuario">
            Não tem uma conta ainda? <br />Cadastre-se aqui
          </Link>
        </form>
      </div>
    </>
  );
}
