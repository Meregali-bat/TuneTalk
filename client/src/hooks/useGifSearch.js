import { useEffect, useState } from 'react';
import { gifsApi } from '../api/index.js';
import { useDebouncedValue } from './useDebouncedValue.js';

// Busca no GIPHY enquanto a pessoa digita; com a busca vazia, os GIFs em alta.
export function useGifSearch(query) {
  const [search, setSearch] = useState({ status: 'loading', results: [] });
  const atual = query.trim();
  const term = useDebouncedValue(atual, 350);

  useEffect(() => {
    if (term !== atual) return undefined;
    let active = true;
    setSearch((current) => ({ ...current, status: 'loading' }));
    gifsApi.search(term)
      .then((results) => active && setSearch({ status: 'done', results: Array.isArray(results) ? results : [], term }))
      .catch((error) => active && setSearch({ status: 'error', results: [], indisponivel: error.status === 503 }));
    return () => { active = false; };
  }, [term, atual]);

  return search;
}
