import { useState } from 'react';
import { useGifSearch } from '../../hooks/useGifSearch.js';

// Escolher um GIF do GIPHY. Abre com os GIFs em alta; digitar busca.
export function GifPicker({ onSelect, onBack }) {
  const [query, setQuery] = useState('');
  const search = useGifSearch(query);
  const carregando = search.status === 'loading' && search.results.length === 0;

  return (
    <div className="composer-step">
      <div className="composer-search-bar">
        <button type="button" className="icon-button" aria-label="Voltar" onClick={onBack}>
          <i className="bi bi-arrow-left" aria-hidden="true" />
        </button>
        <div className="composer-search">
          <i className="bi bi-search" aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar GIF"
            placeholder="Buscar GIF"
            autoComplete="off"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {carregando && <p role="status" className="composer-hint">Buscando…</p>}
      {search.status === 'error' && (
        <p role="alert" className="composer-error">
          {search.indisponivel ? 'A busca de GIFs não está disponível agora.' : 'Não foi possível buscar agora. Tente de novo.'}
        </p>
      )}
      {search.status === 'done' && search.results.length === 0 && (
        <p className="composer-hint">Nenhum GIF para “{search.term}”.</p>
      )}
      {search.results.length > 0 && (
        <ul className={`gif-grid${search.status === 'loading' ? ' is-loading' : ''}`} aria-label="GIFs" aria-busy={search.status === 'loading'}>
          {search.results.map((gif) => (
            <li key={gif.id}>
              <button
                type="button"
                className="gif-grid__item"
                aria-label={gif.titulo}
                style={{ aspectRatio: `${gif.largura} / ${gif.altura}` }}
                onClick={() => onSelect(gif)}
              >
                <img src={gif.previa} alt="" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="gif-credito">Powered by GIPHY</p>
    </div>
  );
}
