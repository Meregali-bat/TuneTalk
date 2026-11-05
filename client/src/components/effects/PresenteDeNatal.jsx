import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { usersApi } from '../../api/index.js';
import { Modal } from '../common/Modal.jsx';
import { ComToca } from './TocaDeNatal.jsx';

export const EVENTO_TOCA = 'tunetalk:ganhou-toca';

/**
 * Quando a pessoa ganha a toca de Natal (primeiro like num post com #xmas), comemora:
 * mostra a foto dela já com a toca. O aviso vem do postsApi.like, por um evento da janela.
 */
export function PresenteDeNatal() {
  const { user } = useAuth();
  const [foto, setFoto] = useState(null);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const ganhou = async () => {
      setAberto(true);
      try {
        setFoto((await usersApi.profile(user.id)).usuario?.fotoPerfil ?? null);
      } catch {
        // Sem a foto, a toca aparece sozinha.
      }
    };
    window.addEventListener(EVENTO_TOCA, ganhou);
    return () => window.removeEventListener(EVENTO_TOCA, ganhou);
  }, [user?.id]);

  if (!aberto) return null;
  const fechar = () => setAberto(false);
  return (
    <Modal open title="Presente de Natal!" onClose={fechar}>
      <div className="presente-natal">
        <ComToca ativa className="presente-natal__foto">
          {foto ? <img src={foto} alt="Sua foto de perfil com a toca de Natal" /> : <span className="presente-natal__vazio" />}
        </ComToca>
        <p>Você ganhou uma <strong>toca de Natal</strong> 🎅 por curtir um post com #xmas. Ela já está na sua foto de perfil.</p>
        <p className="presente-natal__dica">Se quiser tirar, é só ir em Editar perfil.</p>
        <div className="presente-natal__acoes">
          <button type="button" className="composer-link" onClick={fechar}>Valeu!</button>
          <Link to={`/perfil/${user?.id}`} className="composer-submit" onClick={fechar}>Ver meu perfil</Link>
        </div>
      </div>
    </Modal>
  );
}
