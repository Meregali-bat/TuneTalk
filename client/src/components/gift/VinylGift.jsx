import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../../api/index.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { Modal } from '../common/Modal.jsx';

/**
 * Presente dos 100 posts: um disco de vinil flutua no feed até a pessoa tocar nele. O toque abre
 * os parabéns e explica o efeito do perfil que ela ganhou; a partir daí o disco não volta.
 * `versao` muda quando a pessoa posta, para conferir de novo (o 100º post pode ter sido agora).
 */
export function VinylGift({ versao = 0 }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendente, setPendente] = useState(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    let ativo = true;
    usersApi.presente()
      .then(({ pendente: p }) => { if (ativo) setPendente(Boolean(p)); })
      .catch(() => {});
    return () => { ativo = false; };
  }, [versao]);

  const abrir = () => {
    setAberto(true);
    setPendente(false);
    usersApi.abrirPresente().catch(() => {});
  };

  const fechar = useCallback(() => setAberto(false), []);

  const personalizar = () => {
    setAberto(false);
    navigate(`/perfil/${user.id}`, { state: { editarPerfil: true } });
  };

  return (
    <>
      {pendente && (
        <button type="button" className="vinyl-gift" onClick={abrir} aria-label="Abrir presente dos 100 posts">
          <span className="vinyl-gift__disc" aria-hidden="true">
            <span className="vinyl-gift__label" />
          </span>
        </button>
      )}
      <Modal open={aberto} title="Parabéns pelos 100 posts!" onClose={fechar} centered>
        <div className="vinyl-gift__message">
          <span className="vinyl-gift__disc vinyl-gift__disc--grande" aria-hidden="true">
            <span className="vinyl-gift__label" />
          </span>
          <p>
            Obrigado por fazer o TuneTalk acontecer. De presente, seu perfil ganhou um <strong>efeito especial</strong>:
            notas musicais, estrelas ou CDs holográficos caindo na tela de quem abrir o seu perfil.
          </p>
          <p>
            Para escolher a forma e as cores, vá em <strong>Editar perfil</strong> e procure &quot;Efeito do perfil&quot;.
            Dá para trocar quando quiser, ou desligar.
          </p>
          <button type="button" className="composer-submit" onClick={personalizar}>Personalizar meu perfil</button>
        </div>
      </Modal>
    </>
  );
}
