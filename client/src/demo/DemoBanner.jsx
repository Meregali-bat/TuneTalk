import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { DEMO_LOGIN } from './seed.js';

const style = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '.5rem 1rem',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '.5rem 1rem',
  background: '#0b3d1c',
  color: '#fcfffc',
  fontSize: '.85rem',
  textAlign: 'center',
};

const buttonStyle = {
  background: '#2ba84a',
  color: '#fcfffc',
  border: 'none',
  borderRadius: 16,
  padding: '.25rem .75rem',
  fontSize: '.85rem',
};

const reload = () => window.location.reload();

export function DemoBanner({ api, onReset = reload }) {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const enterAsAna = async () => {
    await login(DEMO_LOGIN.email, DEMO_LOGIN.senha);
    navigate('/foryou');
  };

  const restore = () => {
    api.reset();
    onReset();
  };

  return (
    <div role="note" style={style}>
      <span>
        Demonstração com dados fictícios, salvos só neste aparelho. Login: {DEMO_LOGIN.email} / {DEMO_LOGIN.senha}
      </span>
      {!user && <button type="button" style={buttonStyle} onClick={enterAsAna}>Entrar como Ana</button>}
      <button type="button" style={{ ...buttonStyle, background: 'transparent', border: '1px solid #2ba84a' }} onClick={restore}>
        Restaurar dados
      </button>
    </div>
  );
}
