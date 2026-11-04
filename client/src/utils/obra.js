// Endereço da página de um álbum ou música. Vai pela query (e não pelo caminho) porque títulos e
// artistas podem ter "/" (ex.: AC/DC).
export function obraUrl({ tipo, titulo, artista }) {
  const caminho = tipo === 'album' ? '/album' : '/musica';
  return `${caminho}?${new URLSearchParams({ titulo, artista })}`;
}
