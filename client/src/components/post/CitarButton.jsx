import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal.jsx';
import { Composer } from './Composer.jsx';

// Replay (repostar com comentário): abre o compositor com o post citado e, ao publicar, leva para o replay.
// Mostra quantos replays o post tem, como o comentário e o like (e fica do mesmo tamanho que eles).
export function CitarButton({ post }) {
  const quantidade = post.quantidadeReplays ?? 0;
  const [aberto, setAberto] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <button type="button" className="post-action" aria-label={`Dar replay no post (${quantidade} ${quantidade === 1 ? 'replay' : 'replays'})`} onClick={() => setAberto(true)}>
        <i className="bi bi-arrow-repeat" aria-hidden="true" />
        <span className="numero">{quantidade}</span>
      </button>
      {aberto && (
        <Modal open title="Dar replay no post" onClose={() => setAberto(false)} variant="sheet">
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
