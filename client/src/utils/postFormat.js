// Faixas guardam a duração em segundos no campo releaseDate; álbuns guardam a data de lançamento.
export function releaseInfo(releaseDate) {
  if (releaseDate === null || releaseDate === undefined || releaseDate === '') return '';

  const seconds = Number(releaseDate);
  if (!Number.isNaN(seconds)) return `${Math.round(seconds / 60)} min`;

  const year = String(releaseDate).match(/^\d{4}/);
  return year ? year[0] : '';
}

export function starIcons(nota) {
  return Array.from({ length: 5 }, (_, i) => {
    if (nota <= i) return 'empty';
    return nota < i + 1 ? 'half' : 'fill';
  });
}
