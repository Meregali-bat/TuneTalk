import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal.jsx';
import { Composer } from './Composer.jsx';

// Repostar com comentário: abre o compositor com o post citado e, ao publicar, leva para a citação.
export function CitarButton({ post }) {
  const [aberto, setAberto] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <button type="button" className="post-action" aria-label="Citar post" onClick={() => setAberto(true)}>
        <i className="bi bi-quote" aria-hidden="true" />
      </button>
      {aberto && (
        <Modal open title="Citar post" onClose={() => setAberto(false)} variant="sheet">
          <Composer
            citando={post}
            textLabel="O que você acha desse post?"
            placeholder="Concorda? Discorda da nota? Conta aí…"
            onPublished={(id) => { setAberto(false); navigate(`/post/${id}`); }}
          />
        </Modal>
      )}
    </>
  );
}
