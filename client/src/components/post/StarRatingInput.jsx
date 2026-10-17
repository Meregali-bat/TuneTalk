import { useId, useState } from 'react';
import { notaLabel } from '../../../../shared/rating.js';

const STARS = [0, 1, 2, 3, 4];

// Nota de 0 a 10 em cinco estrelas: a metade esquerda de cada estrela vale um ponto ímpar e a
// direita o par seguinte. Cada metade é um radio (acessível por teclado com as setas).
export function StarRatingInput({ value, onChange }) {
  const name = useId();
  const [hover, setHover] = useState(null);
  const shown = hover ?? value ?? 0;

  const option = (nota) => (
    <input
      type="radio"
      name={name}
      value={nota}
      checked={value === nota}
      onChange={() => onChange(nota)}
      aria-label={`${nota} de 10`}
      className="visually-hidden"
    />
  );

  return (
    <div className="rating-input">
      <div
        role="radiogroup"
        aria-label="Nota de 0 a 10"
        className="rating-input__controls"
        onMouseLeave={() => setHover(null)}
      >
        <label className={`rating-input__zero${value === 0 ? ' is-checked' : ''}`} onMouseEnter={() => setHover(0)}>
          {option(0)}
          <span aria-hidden="true">0</span>
        </label>
        <div className="rating-input__stars">
          {STARS.map((star) => {
            const fill = Math.min(2, Math.max(0, shown - star * 2));
            return (
              <span key={star} className="rating-star">
                <i className="bi bi-star rating-star__empty" aria-hidden="true" />
                <span className="rating-star__fill" style={{ width: `${fill * 50}%` }} aria-hidden="true">
                  <i className="bi bi-star-fill" />
                </span>
                {[star * 2 + 1, star * 2 + 2].map((nota) => (
                  <label
                    key={nota}
                    className={`rating-star__half rating-star__half--${nota % 2 ? 'left' : 'right'}`}
                    onMouseEnter={() => setHover(nota)}
                  >
                    {option(nota)}
                  </label>
                ))}
              </span>
            );
          })}
        </div>
      </div>
      <p className="rating-input__caption" aria-live="polite">
        {value === null || value === undefined
          ? 'Toque nas estrelas: cada metade vale 1 ponto.'
          : `${value}/10 · ${notaLabel(value)}`}
      </p>
    </div>
  );
}
