// Trecho da letra no post: os versos em destaque e a música creditada embaixo.
// Ignora dado estranho (não lista, versos vazios) em vez de quebrar o card.
export function LyricQuote({ versos, titulo, artista }) {
  const linhas = Array.isArray(versos) ? versos.filter((v) => typeof v === 'string' && v.trim()) : [];
  if (linhas.length === 0) return null;
  return (
    <figure className="lyric-quote">
      <i className="bi bi-quote lyric-quote__icon" aria-hidden="true" />
      <blockquote className="lyric-quote__versos" aria-label={`Trecho da letra de ${titulo}`}>
        {linhas.map((verso, i) => <p key={i}>{verso}</p>)}
      </blockquote>
      <figcaption className="lyric-quote__credito">{titulo}{artista ? ` · ${artista}` : ''}</figcaption>
    </figure>
  );
}
