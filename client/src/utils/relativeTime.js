// "há 5 minutos", "ontem", "há 2 semanas"... sem dependências, via Intl.
const format = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

const UNITS = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

// Limite (em segundos) a partir do qual cada unidade passa a ser usada.
const THRESHOLDS = { year: 335 * 24 * 3600, month: 28 * 24 * 3600, week: 7 * 24 * 3600, day: 22 * 3600, hour: 45 * 60, minute: 45 };

export function relativeTime(date, now = new Date()) {
  const seconds = (now.getTime() - new Date(date).getTime()) / 1000;
  const unit = UNITS.find(([name]) => seconds >= THRESHOLDS[name]);
  if (!unit) return 'agora mesmo';
  const [name, size] = unit;
  return format.format(-Math.max(1, Math.round(seconds / size)), name);
}

// Versão curta, como no Twitter: "agora", "5 min", "5 h", "3 d" e, depois de uma semana, a data.
const data = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dataComAno = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function shortTime(date, now = new Date()) {
  const quando = new Date(date);
  const segundos = (now.getTime() - quando.getTime()) / 1000;
  if (segundos < 60) return 'agora';
  if (segundos < 3600) return `${Math.floor(segundos / 60)} min`;
  if (segundos < 24 * 3600) return `${Math.floor(segundos / 3600)} h`;
  if (segundos < 7 * 24 * 3600) return `${Math.floor(segundos / (24 * 3600))} d`;
  return (quando.getUTCFullYear() === now.getUTCFullYear() ? data : dataComAno).format(quando);
}
