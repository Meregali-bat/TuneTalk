import { useState } from 'react';
import { usersApi } from '../../api/index.js';
import { useAsync } from '../../hooks/useAsync.js';
import { UserRow } from './UserRow.jsx';

/**
 * "Quem seguir": pessoas com notas parecidas às suas nos mesmos discos (ou, para quem ainda não
 * avaliou nada, quem posta bastante). `onSeguiu(quantos)` avisa quantas a pessoa já seguiu daqui.
 */
export function SugestoesDeQuemSeguir({ titulo = 'Quem seguir', onSeguiu }) {
  const { data: sugestoes, error } = useAsync(() => usersApi.sugestoes(), []);
  const [seguindo, setSeguindo] = useState(() => new Set());

  if (error || sugestoes?.length === 0) return null;
  if (!sugestoes) return <p role="status" className="composer-hint">Procurando gente com gosto parecido…</p>;

  const marcar = (id, segue) => {
    const novo = new Set(seguindo);
    if (segue) novo.add(id);
    else novo.delete(id);
    setSeguindo(novo);
    onSeguiu?.(novo.size);
  };

  return (
    <section className="sugestoes" aria-labelledby="sugestoes-titulo">
      <h2 id="sugestoes-titulo" className="search-page__subtitulo">
        <i className="bi bi-people" aria-hidden="true" /> {titulo}
      </h2>
      <ul className="user-list">
        {sugestoes.map(({ usuario, motivo }) => (
          <UserRow
            key={usuario.id}
            usuario={usuario}
            detalhe={motivo}
            following={seguindo.has(usuario.id)}
            onFollowChange={(segue) => marcar(usuario.id, segue)}
          />
        ))}
      </ul>
    </section>
  );
}
