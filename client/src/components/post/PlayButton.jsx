import { useEffect, useRef, useState } from 'react';

export function PlayButton({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    return () => audio?.pause();
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      setPlaying(true);
      Promise.resolve(audio.play()).catch(() => setPlaying(false));
    }
  };

  return (
    <>
      <audio ref={audioRef} src={src} preload="none" onEnded={() => setPlaying(false)} />
      <button
        type="button"
        className="play-pause-btn"
        aria-label={playing ? 'Pausar prévia' : 'Tocar prévia'}
        onClick={toggle}
      >
        <i className={playing ? 'bi bi-pause-fill' : 'bi bi-play-fill'} />
      </button>
    </>
  );
}
