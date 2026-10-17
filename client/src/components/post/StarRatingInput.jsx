import { useId } from 'react';

// A ordem 5→1 combinada com `flex-direction: row-reverse` no CSS mostra as estrelas da esquerda
// para a direita e permite colorir as anteriores à selecionada com o seletor `~`.
const VALUES = [5, 4, 3, 2, 1];

export function StarRatingInput({ value, onChange }) {
  const name = useId();

  return (
    <div className="star-rating" role="radiogroup" aria-label="Nota">
      {VALUES.map((n) => {
        const id = `${name}-${n}`;
        const label = `${n} ${n === 1 ? 'estrela' : 'estrelas'}`;
        return [
          <input
            key={`input-${n}`}
            type="radio"
            id={id}
            name={name}
            value={n}
            aria-label={label}
            checked={value === n}
            onChange={() => onChange(n)}
          />,
          <label key={`label-${n}`} htmlFor={id} title={label}>
            <i className="bi bi-star-fill" />
          </label>,
        ];
      })}
    </div>
  );
}
