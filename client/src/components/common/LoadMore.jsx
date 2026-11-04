import { useEffect, useRef } from 'react';

// Fica no fim de uma lista em páginas: quando chega perto da tela (bem antes de a pessoa ver o último post),
// já pede a próxima página. Assim o feed continua sem a pessoa esperar.
export function LoadMore({ carregarMais, carregandoMais, erroMais, fim, onRetry, quantidade }) {
  const ref = useRef(null);

  useEffect(() => {
    if (fim || erroMais || !ref.current || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting) carregarMais();
    }, { rootMargin: '0px 0px 1500px 0px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
    // Recria ao crescer a lista: se o fim ainda estiver perto da tela, pede mais uma página.
  }, [carregarMais, fim, erroMais, quantidade]);

  if (erroMais) {
    return (
      <div className="feed-more feed-more--error">
        <p>Não deu para carregar mais posts.</p>
        <button type="button" onClick={onRetry}>Tentar de novo</button>
      </div>
    );
  }
  if (fim) return <p className="feed-more feed-more--end">Você chegou ao fim.</p>;
  return (
    <div ref={ref} className="feed-more">
      {carregandoMais && (
        <span role="status" className="feed-more__loading">
          <span className="feed-more__spinner" aria-hidden="true" />
          <span className="visually-hidden">Carregando mais posts</span>
        </span>
      )}
    </div>
  );
}
