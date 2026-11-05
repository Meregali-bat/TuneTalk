import { useEffect, useRef, useState } from 'react';

const LIMIAR = 64; // px puxados (já com a resistência) para soltar e atualizar
const MAXIMO = 110;
const RESISTENCIA = 0.5; // a lista anda metade do que o dedo anda
const VOLTA_MS = 300; // tempo da lista subir de volta (igual à transição no CSS)

/**
 * "Arrastar para atualizar": com a página no topo, puxar para baixo desce o que
 * vem DEPOIS deste componente (os posts), e o carregando aparece no espaço que abre. O que vem
 * antes (cabeçalho, abas, barra de título) fica parado. Soltando depois do limiar, o espaço fica
 * aberto girando até onRefresh terminar.
 * Necessário principalmente no app da tela inicial do iPhone, que não tem isso do Safari.
 */
export function PullToRefresh({ onRefresh }) {
  const [puxado, setPuxado] = useState(0);
  const [puxando, setPuxando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [ativo, setAtivo] = useState(false); // a lista está (ou está voltando de) deslocada
  const inicio = useRef(null);
  const puxadoRef = useRef(0);
  const atualizandoRef = useRef(false);
  const voltaRef = useRef(null);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const mover = (valor) => {
      puxadoRef.current = valor;
      setPuxado(valor);
      if (valor > 0) {
        clearTimeout(voltaRef.current);
        setAtivo(true);
      } else {
        // Só tira o deslocamento depois de a lista terminar de subir (senão ela "pula").
        voltaRef.current = setTimeout(() => setAtivo(false), VOLTA_MS);
      }
    };

    const start = (event) => {
      // Com uma janela aberta por cima (post, notificações…), o gesto é dela.
      if (atualizandoRef.current || window.scrollY > 0 || document.body.classList.contains('modal-open')) return;
      inicio.current = event.touches[0].clientY;
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
      clearTimeout(voltaRef.current);
      window.removeEventListener('touchstart', start);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
      window.removeEventListener('touchcancel', end);
    };
  }, []);

  // O deslocamento vai no documento: os irmãos seguintes (a lista) leem a mesma medida.
  useEffect(() => {
    document.documentElement.style.setProperty('--ptr-puxado', `${puxado}px`);
  }, [puxado]);
  useEffect(() => () => document.documentElement.style.removeProperty('--ptr-puxado'), []);

  const progresso = Math.min(1, puxado / LIMIAR);
  const classes = ['pull-refresh', ativo && 'is-ativo', puxando && 'is-puxando', atualizando && 'is-atualizando'];

  return (
    <>
      <div className={classes.filter(Boolean).join(' ')} aria-hidden="true" data-testid="pull-refresh">
        <span
          className="pull-refresh__giro"
          style={{ opacity: atualizando ? 1 : progresso, '--giro': `${(atualizando ? 1 : progresso) * 300}deg` }}
        />
      </div>
      {atualizando && <p role="status" className="visually-hidden">Atualizando…</p>}
    </>
  );
}
