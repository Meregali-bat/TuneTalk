import { useEffect } from 'react';

// Publica a área realmente visível (descontando o teclado do celular) em --vvh / --vvt.
// No iPhone o teclado não encolhe a página: só a visualViewport muda, então o CSS precisa dela.
export function useVisualViewportVars(active) {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!active || !viewport) return undefined;

    const style = document.documentElement.style;
    const update = () => {
      style.setProperty('--vvh', `${viewport.height}px`);
      style.setProperty('--vvt', `${viewport.offsetTop}px`);
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      style.removeProperty('--vvh');
      style.removeProperty('--vvt');
    };
  }, [active]);
}
