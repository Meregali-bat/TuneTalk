import { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Composer } from './Composer.jsx';

// Pode ser controlado de fora (open/onOpenChange), ex.: botão do feed vazio; sem isso, controla o próprio estado.
// Fechar o diálogo descarta o rascunho.
export function CreatePost({ onCreated, open: controlledOpen, onOpenChange }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const close = () => setOpen(false);

  const handlePublished = () => {
    close();
    onCreated();
  };

  return (
    <>
      <button type="button" className="composer-fab" aria-label="Criar post" onClick={() => setOpen(true)}>
        <i className="bi bi-music-note-beamed" aria-hidden="true" />
        <span className="composer-fab__label" aria-hidden="true">Postar</span>
      </button>
      <Modal open={open} title="Novo post" onClose={close} variant="sheet">
        <Composer onPublished={handlePublished} />
      </Modal>
    </>
  );
}
