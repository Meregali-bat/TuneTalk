import { useEffect, useRef, useState } from 'react';

const LIMIAR = 70; // px puxados (já com a resistência) para soltar e atualizar
const MAXIMO = 110;
const RESISTENCIA = 0.5; // o indicador anda metade do que o dedo anda, como no Twitter

/**
 * "Arrastar para atualizar" no celular: com a página no topo, puxar para baixo mostra um círculo
 * que gira com o dedo; soltando depois do limiar, chama onRefresh e gira até ele terminar.
 * Necessário principalmente no app da tela inicial do iPhone, que não tem isso do Safari.
 */
export function PullToRefresh({ onRefresh }) {
  const [puxado, setPuxado] = useState(0);
  const [puxando, setPuxando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [topo, setTopo] = useState(null); // onde o topo do app termina (o círculo sai de baixo dele)
  const inicio = useRef(null);
  const puxadoRef = useRef(0);
  const atualizandoRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const mover = (valor) => {
      puxadoRef.current = valor;
      setPuxado(valor);
    };

    const start = (event) => {
      if (atualizandoRef.current || window.scrollY > 0) return;
      inicio.current = event.touches[0].clientY;
      setTopo(document.querySelector('.app-header')?.getBoundingClientRect().bottom ?? null);
      setPuxando(true);
    };

    const move = (event) => {
      if (inicio.current === null) return;
      const dy = event.touches[0].clientY - inicio.current;
      mover(dy > 0 ? Math.min(MAXIMO, dy * RESISTENCIA) : 0);
    };

    const end = async () => {
      if (inicio.current === null) return;
      inicio.current = null;
      setPuxando(false);
      if (puxadoRef.current < LIMIAR) {
        mover(0);
        return;
      }
      mover(LIMIAR);
      atualizandoRef.current = true;
      setAtualizando(true);
      try {
        await onRefreshRef.current();
      } finally {
        atualizandoRef.current = false;
        setAtualizando(false);
        mover(0);
      }
    };

    window.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', end);
    return () => {
      window.removeEventListener('touchstart', start);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
      window.removeEventListener('touchcancel', end);
    };
  }, []);

  const progresso = Math.min(1, puxado / LIMIAR);

  return (
    <>
      <div
        className={`pull-refresh${puxando ? ' is-puxando' : ''}${atualizando ? ' is-atualizando' : ''}`}
        aria-hidden="true"
        style={{ '--puxado': `${puxado}px`, opacity: atualizando ? 1 : progresso, ...(topo !== null && { top: `${topo + 4}px` }) }}
      >
        <i className="bi bi-arrow-clockwise" style={atualizando ? undefined : { transform: `rotate(${progresso * 270}deg)` }} />
      </div>
      {atualizando && <p role="status" className="visually-hidden">Atualizando…</p>}
    </>
  );
}
