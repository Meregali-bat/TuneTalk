import { useEffect, useState } from 'react';
import { usersApi } from '../api/index.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { UserRow } from '../components/profile/UserRow.jsx';

function usePeopleSearch(texto) {
  const [busca, setBusca] = useState({ status: 'idle', results: [] });
  const termo = useDebouncedValue(texto.trim(), 300);

  useEffect(() => {
    if (!termo) {
      setBusca({ status: 'idle', results: [] });
      return undefined;
    }
    let ativo = true;
    setBusca((atual) => ({ ...atual, status: 'loading' }));
    usersApi.search(termo)
      .then((results) => ativo && setBusca({ status: 'done', results, termo }))
      .catch(() => ativo && setBusca({ status: 'error', results: [] }));
    return () => { ativo = false; };
  }, [termo]);

  return [busca, setBusca];
}

export function SearchPage() {
  const [texto, setTexto] = useState('');
  const [busca, setBusca] = usePeopleSearch(texto);

  // Seguir/deixar de seguir atualiza só aquela pessoa na lista.
  const marcarSeguindo = (id, seguindo) =>
    setBusca((atual) => ({ ...atual, results: atual.results.map((u) => (u.id === id ? { ...u, seguindo } : u)) }));

  return (
    <div className="feed search-page">
      <h1 className="search-page__title">Buscar</h1>
      <div className="composer-search">
        <i className="bi bi-search" aria-hidden="true" />
        <input
          type="search"
          aria-label="Buscar pessoas"
          placeholder="Nome ou @usuário"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck="false"
          autoFocus
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
        />
      </div>

      {busca.status === 'idle' && <p className="composer-hint">Busque pelo nome ou pelo @.</p>}
      {busca.status === 'loading' && <p role="status" className="composer-hint">Buscando…</p>}
      {busca.status === 'error' && (
        <p role="alert" className="composer-error">Não foi possível buscar agora. Tente de novo.</p>
      )}
      {busca.status === 'done' && busca.results.length === 0 && (
        <p className="composer-hint">Ninguém encontrado para “{busca.termo}”.</p>
      )}
      {busca.status === 'done' && busca.results.length > 0 && (
        <ul className="user-list search-page__results" aria-label="Pessoas encontradas">
          {busca.results.map((usuario) => (
            <UserRow
              key={usuario.id}
              usuario={usuario}
              following={usuario.seguindo}
              onFollowChange={(seguindo) => marcarSeguindo(usuario.id, seguindo)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
