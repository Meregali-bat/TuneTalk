// Favoritos do perfil, como os filmes favoritos do Letterboxd: até 5 músicas, 5 álbuns e 5 artistas.
export const SECOES_FAVORITOS = [
  { chave: 'musicas', titulo: 'Músicas favoritas', aba: 'Músicas', tipo: 'musica' },
  { chave: 'albuns', titulo: 'Álbuns favoritos', aba: 'Álbuns', tipo: 'album' },
  { chave: 'artistas', titulo: 'Artistas favoritos', aba: 'Artistas', tipo: 'artista' },
];

// Lê sem confiar no formato: o que não for lista vira lista vazia.
export const listaDeFavoritos = (favoritos, chave) => {
  const lista = favoritos?.[chave];
  return Array.isArray(lista) ? lista.filter((item) => item && item.titulo && item.capa) : [];
};

export function FavoriteCover({ item, redondo }) {
  return <img src={item.capa} alt="" loading="lazy" className={`favorite-cover${redondo ? ' favorite-cover--redondo' : ''}`} />;
}

export function ProfileFavorites({ favoritos, editavel, onEditar }) {
  const secoes = SECOES_FAVORITOS.map((secao) => ({ ...secao, lista: listaDeFavoritos(favoritos, secao.chave) }));
  const algum = secoes.some((secao) => secao.lista.length > 0);
  if (!algum && !editavel) return null;

  return (
    <section className="profile-favorites" aria-label="Favoritos">
      <div className="profile-favorites__topo">
        <h2>Favoritos</h2>
        {editavel && algum && (
          <button type="button" className="composer-link" onClick={onEditar}>Editar favoritos</button>
        )}
      </div>

      {!algum && (
        <button type="button" className="profile-favorites__vazio" onClick={onEditar}>
          <i className="bi bi-plus-lg" aria-hidden="true" />
          Escolha suas 5 músicas, álbuns e artistas favoritos
        </button>
      )}

      {secoes.filter((secao) => secao.lista.length > 0).map((secao) => (
        <div key={secao.chave} className="profile-favorites__secao">
          <h3>{secao.titulo}</h3>
          <ul className="favorites-grid" aria-label={secao.titulo}>
            {secao.lista.map((item) => (
              <li key={item.id} className="favorites-grid__item" title={item.artista ? `${item.titulo} · ${item.artista}` : item.titulo}>
                <FavoriteCover item={item} redondo={secao.chave === 'artistas'} />
                <span className="favorites-grid__titulo">{item.titulo}</span>
                {item.artista && <span className="favorites-grid__artista">{item.artista}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
