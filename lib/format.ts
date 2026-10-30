import { teamInfo } from '@/lib/league-data';

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

/** Форматирование без Intl, чтобы SSR и клиент совпадали. */
export function fmtDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function fmtDateShort(isoDate: string): string {
  const [, m, d] = isoDate.split('-').map(Number);
  if (!m || !d) return isoDate;
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
}

export function weekday(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return WEEKDAYS[date.getUTCDay()];
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const perGame = (total: number, games: number) =>
  games ? Math.round((total / games) * 10) / 10 : 0;

export const pct = (made: number, att: number) =>
  att ? Math.round((made / att) * 1000) / 10 : 0;

export function formatPct(made: number, att: number): string {
  if (att === 0) return '—';
  return `${Math.round((made / att) * 100)}%`;
}

export function mmss(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function teamColor(name: string): string {
  return teamInfo(name)?.color ?? '#64748b';
}

export function teamLogo(name: string): string | null {
  return teamInfo(name)?.logo ?? null;
}

/** Игровой номер: -1 означает, что он не указан в заявке. */
export function jersey(number: number): string {
  return number >= 0 ? String(number) : '—';
}

export function initials(name: string): string {
  const parts = name.trim().split(/[\s-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Сравнение строк по кодовым точкам.
 *
 * `localeCompare` опирается на ICU, а он по-разному упорядочивает кириллицу
 * и латиницу в Node и в браузере — из-за этого порядок списков на сервере и
 * на клиенте расходился и ломал гидратацию. Здесь результат одинаков везде.
 */
export function compareText(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
