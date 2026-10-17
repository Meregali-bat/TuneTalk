import { useState } from 'react';
import { postsApi } from '../../api/index.js';

export function LikeButton({ postId, likes, curtido }) {
  const [state, setState] = useState({ likes, curtido });
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    if (pending) return;
    setPending(true);
    try {
      const total = state.curtido ? await postsApi.unlike(postId) : await postsApi.like(postId);
      setState((s) => ({ likes: total, curtido: !s.curtido }));
    } catch {
      // mantém o estado anterior; a próxima interação tenta de novo
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      className="likes-count like-button btn"
      aria-label={state.curtido ? 'Descurtir' : 'Curtir'}
      aria-pressed={state.curtido}
      onClick={toggle}
    >
      <i className={`${state.curtido ? 'bi-heart-fill' : 'bi bi-heart'} botao-interacao`} />
      <span className="numero">{state.likes}</span>
    </button>
  );
}
