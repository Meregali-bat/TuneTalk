import { useLocation, useNavigate } from 'react-router-dom';

// Barra fixa com "Voltar" e o título da página (post, hashtag...).
export function BackBar({ titulo, subtitulo }) {
  const navigate = useNavigate();
  const location = useLocation();
  // Quem abriu o link direto não tem para onde voltar no histórico.
  const back = () => (location.key === 'default' ? navigate('/foryou') : navigate(-1));

  return (
    <div className="thread-bar">
      <button type="button" className="icon-button" aria-label="Voltar" onClick={back}>
        <i className="bi bi-arrow-left" aria-hidden="true" />
      </button>
      <div className="thread-bar__titulos">
        <h1 className="thread-bar__title">{titulo}</h1>
        {subtitulo && <p className="thread-bar__subtitle">{subtitulo}</p>}
      </div>
    </div>
  );
}
