import { useEffect, useRef, useState } from 'react';
import { musicApi } from '../../api/index.js';
import { precisaRenovar } from '../../utils/previewLink.js';

/**
 * Toca a prévia de 30 s. Os links do Deezer vencem (e os do sistema antigo já morreram), então
 * com link velho buscamos um novo da mesma música; se tocar falhar, tentamos de novo uma vez.
 * O link novo é buscado assim que o post aparece na tela: no iPhone o áudio só pode começar
 * durante o toque, e esperar a resposta do servidor depois do toque faria o Safari bloquear.
 */
// Só uma prévia toca por vez no app: quem começa a tocar avisa, e as outras pausam.
const EVENTO_TOCANDO = 'tunetalk:previa-tocando';

export function PlayButton({ src, titulo, artista, rotulo, size }) {
  const audioRef = useRef(null);
  const buttonRef = useRef(null);
  const [link, setLink] = useState(src);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    const outraTocou = (event) => {
      if (event.detail !== audio && !audio.paused) audio.pause();
    };
    window.addEventListener(EVENTO_TOCANDO, outraTocou);
    return () => {
      window.removeEventListener(EVENTO_TOCANDO, outraTocou);
      audio?.pause();
    };
  }, []);

  const linkNovo = async () => {
    const novo = await musicApi.preview(titulo, artista);
    setLink(novo);
    if (audioRef.current) audioRef.current.src = novo;
    return novo;
  };

  // Renova o link em segundo plano quando o post fica visível (só os que aparecem na tela).
  useEffect(() => {
    if (!titulo || !precisaRenovar(link) || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(([entrada]) => {
      if (!entrada.isIntersecting) return;
      observer.disconnect();
      linkNovo().catch(() => {});
    }, { rootMargin: '200px' });
    observer.observe(buttonRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulo]);

  const tocar = async () => {
    const audio = audioRef.current;
    setPlaying(true);
    try {
      if (precisaRenovar(link) && titulo) await linkNovo();
      window.dispatchEvent(new CustomEvent(EVENTO_TOCANDO, { detail: audio }));
      try {
        await audio.play();
      } catch (erro) {
        if (!titulo) throw erro;
        await linkNovo();
        await audio.play();
      }
    } catch {
      setPlaying(false);
    }
  };

  const toggle = () => {
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      tocar();
    }
  };

  return (
    <>
      <audio ref={audioRef} src={link} preload="none" onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} />
      <button
        ref={buttonRef}
        type="button"
        className={`play-button${size === 'sm' ? ' play-button--sm' : ''}${playing ? ' is-playing' : ''}`}
        aria-label={`${playing ? 'Pausar prévia' : 'Tocar prévia'}${rotulo ? ` de ${rotulo}` : ''}`}
        onClick={toggle}
      >
        <i className={playing ? 'bi bi-pause-fill' : 'bi bi-play-fill'} aria-hidden="true" />
      </button>
    </>
  );
}
