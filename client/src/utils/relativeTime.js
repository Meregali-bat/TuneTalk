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
