import { starIcons } from '../../utils/postFormat.js';

const ICON_CLASS = { fill: 'bi bi-star-fill', half: 'bi bi-star-half', empty: 'bi bi-star' };

// Nota de 0 a 10 desenhada em 5 estrelas: cada ponto é meia estrela.
export function StarRating({ nota }) {
  return (
    <span role="img" aria-label={`Nota ${nota} de 10`}>
      {starIcons(nota / 2).map((kind, i) => (
        <i key={i} className={ICON_CLASS[kind]} />
      ))}
    </span>
  );
}
