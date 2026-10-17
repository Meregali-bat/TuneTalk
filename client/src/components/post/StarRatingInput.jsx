import { notaLabel } from '../../../../shared/rating.js';

const STARS = [1, 2, 3, 4, 5];

// Cada toque numa estrela avança o ciclo dela: meia → cheia → vazia → meia...
// As estrelas antes dela ficam cheias. Notas de 0 a 10 (cada ponto é meia estrela).
export function nextNota(current, star) {
  const half = star * 2 - 1;
  const full = star * 2;
  if (current === half) return full;
  if (current === full) return full - 2;
  return half;
}

export function StarRatingInput({ value, onChange }) {
  const shown = value ?? 0;

  return (
    <div className="rating-input">
      <div role="group" aria-label="Nota de 0 a 10" className="rating-input__stars">
        {STARS.map((star) => {
          const fill = Math.min(2, Math.max(0, shown - (star - 1) * 2));
          return (
            <button
              key={star}
              type="button"
              className="rating-star"
              aria-label={`Estrela ${star}`}
              onClick={() => onChange(nextNota(value, star))}
            >
              <i className="bi bi-star rating-star__empty" aria-hidden="true" />
              <span className="rating-star__fill" style={{ width: `${fill * 50}%` }} aria-hidden="true">
                <i className="bi bi-star-fill" />
              </span>
            </button>
          );
        })}
      </div>
      <p className="rating-input__caption" aria-live="polite">
        {value === null || value === undefined
          ? 'Toque numa estrela: 1 toque deixa meia, 2 enche, 3 esvazia.'
          : `${value}/10 · ${notaLabel(value)}`}
      </p>
    </div>
  );
}
