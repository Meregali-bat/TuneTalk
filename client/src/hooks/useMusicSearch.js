import { useEffect, useState } from 'react';
import { musicApi } from '../api/index.js';
import { useDebouncedValue } from './useDebouncedValue.js';

// Busca no Deezer enquanto a pessoa digita. tipo: 'musica' (faixas), 'album' ou 'artista'.
export function useMusicSearch(query, tipo) {
  const [search, setSearch] = useState({ status: 'idle', results: [] });
  const atual = query.trim();
  const term = useDebouncedValue(atual, 300);

  useEffect(() => {
    if (!atual) {
      setSearch({ status: 'idle', results: [] });
      return undefined;
    }
    // Ainda digitando (ou o texto acabou de ser trocado): espera o debounce alcançar o que está escrito,
    // para não buscar um termo velho (ex.: ao trocar de aba com a busca limpa).
    if (term !== atual) return undefined;
    let active = true;
    setSearch((current) => ({ ...current, status: 'loading' }));
    (tipo === 'musica' ? musicApi.search(term) : musicApi.search(term, tipo))
      .then((results) => active && setSearch({ status: 'done', results: Array.isArray(results) ? results : [], term }))
      .catch(() => active && setSearch({ status: 'error', results: [] }));
    return () => { active = false; };
  }, [term, atual, tipo]);

  return search;
}
