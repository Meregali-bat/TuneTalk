import { useState } from 'react';
import { Modal } from './Modal.jsx';

/** Pergunta antes de bloquear: bloquear desfaz o seguir dos dois lados. */
export function ConfirmarBloqueio({ usuario, onClose, onConfirmar }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const confirmar = async () => {
    setEnviando(true);
    setErro('');
    try {
      await onConfirmar();
    } catch (e) {
      setErro(e.message || 'Não deu para bloquear. Tente de novo.');
      setEnviando(false);
    }
  };

  return (
    <Modal open title={`Bloquear @${usuario.nome}?`} onClose={onClose} centered>
      <div className="confirmar">
        <p>
          Vocês deixam de se seguir e não veem mais os posts um do outro. @{usuario.nome} não
          poderá seguir, curtir nem comentar nos seus posts. Dá para desfazer depois, no perfil.
        </p>
        {erro && <p role="alert" className="field-error">{erro}</p>}
        <div className="confirmar__acoes">
          <button type="button" className="confirmar__cancelar" onClick={onClose}>Cancelar</button>
          <button type="button" className="confirmar__perigo" onClick={confirmar} disabled={enviando}>
            {enviando ? 'Bloqueando…' : 'Bloquear'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
