// Favoritos do perfil, como os filmes favoritos do Letterboxd: até 5 músicas, 5 álbuns e 5 artistas.
export const SECOES_FAVORITOS = [
  { chave: 'musicas', titulo: 'Músicas favoritas', aba: 'Músicas', tipo: 'musica', deezer: 'track' },
  { chave: 'albuns', titulo: 'Álbuns favoritos', aba: 'Álbuns', tipo: 'album', deezer: 'album' },
  { chave: 'artistas', titulo: 'Artistas favoritos', aba: 'Artistas', tipo: 'artista', deezer: 'artist' },
];

// Os ids vêm do Deezer: tocar na capa abre a música, o álbum ou o artista lá.
const linkDeezer = (secao, item) => `https://www.deezer.com/${secao.deezer}/${encodeURIComponent(item.id)}`;

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
        <div className="profile-favorites__vazio">
          <div className="profile-favorites__capas" aria-hidden="true">
            <span /><span /><span className="favorite-cover--redondo" />
          </div>
          <p>Mostre seu gosto: escolha até 5 músicas, 5 álbuns e 5 artistas que definem você.</p>
          <button type="button" className="feed-empty__action" onClick={onEditar}>Escolher favoritos</button>
        </div>
      )}

      {secoes.filter((secao) => secao.lista.length > 0).map((secao) => (
        <div key={secao.chave} className="profile-favorites__secao">
          <h3>{secao.titulo}</h3>
          <ul className="favorites-grid" aria-label={secao.titulo}>
            {secao.lista.map((item) => (
              <li key={item.id} className="favorites-grid__item">
                <a
                  href={linkDeezer(secao, item)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="favorites-grid__link"
                  aria-label={`${item.titulo}${item.artista ? ` · ${item.artista}` : ''} (abre no Deezer)`}
                >
                  <FavoriteCover item={item} redondo={secao.chave === 'artistas'} />
                  <span className="favorites-grid__titulo" aria-hidden="true">{item.titulo}</span>
                  {item.artista && <span className="favorites-grid__artista" aria-hidden="true">{item.artista}</span>}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
