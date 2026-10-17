import { starIcons } from '../../utils/postFormat.js';

const ICON_CLASS = { fill: 'bi bi-star-fill', half: 'bi bi-star-half', empty: 'bi bi-star' };

export function StarRating({ nota }) {
  return (
    <span role="img" aria-label={`Nota ${nota} de 5`}>
      {starIcons(nota).map((kind, i) => (
        <i key={i} className={ICON_CLASS[kind]} />
      ))}
    </span>
  );
}
