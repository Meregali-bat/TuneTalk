import { useState } from 'react';
import { postsApi } from '../../api/index.js';

// Enfeites que saem do coração ao curtir um post com hashtag de Natal (#xmas).
const ENFEITES = { natal: ['❄️', '⭐', '🎄', '✨', '🎁', '❄️', '⭐', '✨'] };

// tema: 'natal' nos posts com #xmas: coração vermelho e uma chuva de enfeites ao curtir.
export function LikeButton({ postId, likes, curtido, tema = null }) {
  const [state, setState] = useState({ likes, curtido });
  const [pending, setPending] = useState(false);
  // Conta as curtidas com festa: a cada uma, os enfeites são recriados e a animação recomeça.
  // Eles terminam invisíveis (o CSS deixa no último quadro), então não precisam sair da tela.
  const [festa, setFesta] = useState(0);
  const enfeites = tema ? ENFEITES[tema] : null;

  const toggle = async () => {
    if (pending) return;
    setPending(true);
    const curtindo = !state.curtido;
    // A festa começa no toque, sem esperar o servidor.
    if (curtindo && enfeites) setFesta((n) => n + 1);
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
      className={`post-action like-button${state.curtido ? ' is-active' : ''}${tema ? ` like-button--${tema}` : ''}`}
      aria-label={state.curtido ? 'Descurtir' : 'Curtir'}
      aria-pressed={state.curtido}
      onClick={toggle}
    >
      {/* Chaves diferentes para o coração e os enfeites: com a mesma chave, o React não apagava os
          corações antigos e eles se acumulavam no botão a cada curtida. */}
      <i
        key={`coracao-${festa}`}
        className={`${state.curtido ? 'bi bi-heart-fill' : 'bi bi-heart'}${festa ? ' like-button__pulo' : ''}`}
        aria-hidden="true"
      />
      <span className="numero">{state.likes}</span>
      {festa > 0 && enfeites && (
        <span key={`festa-${festa}`} className="like-festa" aria-hidden="true" data-testid="like-festa">
          {enfeites.map((enfeite, i) => (
            <span key={i} style={{ '--angulo': `${(360 / enfeites.length) * i - 90}deg`, '--atraso': `${(i % 3) * 40}ms` }}>{enfeite}</span>
          ))}
        </span>
      )}
    </button>
  );
}
