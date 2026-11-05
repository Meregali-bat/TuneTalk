import { useState } from 'react';
import { Modal } from './Modal.jsx';

/** Pergunta antes de sair da conta: o ícone de sair fica ao lado do perfil e é fácil tocar sem querer. */
export function ConfirmarSaida({ onClose, onConfirmar }) {
  const [saindo, setSaindo] = useState(false);

  const confirmar = async () => {
    setSaindo(true);
    try {
      await onConfirmar();
    } catch {
      setSaindo(false);
    }
  };

  return (
    <Modal open title="Sair da conta?" onClose={onClose} centered>
      <div className="confirmar">
        <p>Para voltar, você vai precisar entrar de novo com seu email e senha.</p>
        <div className="confirmar__acoes">
          <button type="button" className="confirmar__cancelar" onClick={onClose}>Cancelar</button>
          <button type="button" className="confirmar__perigo" onClick={confirmar} disabled={saindo}>
            {saindo ? 'Saindo…' : 'Sair'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
