import { compareText } from '@/lib/format';
import type { ArchivedMatch } from '@/types/match';

export type StandingRow = {
  team: string;
  division: string;
  g: number;
  w: number;
  l: number;
  pf: number;
  pa: number;
  diff: number;
  pts: number;
  /** Последние 5 результатов, свежие первыми */
  form: ('W' | 'L')[];
  streak: string;
};

/**
 * Турнирная таблица по правилам ФИБА:
 * победа — 2 очка, поражение — 1 очко.
 */
export function computeStandings(matches: ArchivedMatch[]): StandingRow[] {
  const map = new Map<string, StandingRow>();
  const get = (team: string, division: string) => {
    let row = map.get(team);
    if (!row) {
      row = { team, division, g: 0, w: 0, l: 0, pf: 0, pa: 0, diff: 0, pts: 0, form: [], streak: '' };
      map.set(team, row);
    }
    return row;
  };

  const played = matches
    .filter((match) => match.status === 'final')
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const match of played) {
    const home = get(match.home.name, match.division);
    const away = get(match.away.name, match.division);
    home.g += 1;
    away.g += 1;
    home.pf += match.home.score;
    home.pa += match.away.score;
    away.pf += match.away.score;
    away.pa += match.home.score;

    const homeWon = match.home.score > match.away.score;
    if (homeWon) {
      home.w += 1;
      away.l += 1;
    } else {
      away.w += 1;
      home.l += 1;
    }
    home.form.unshift(homeWon ? 'W' : 'L');
    away.form.unshift(homeWon ? 'L' : 'W');
  }

  return [...map.values()]
    .map((row) => {
      const form = row.form.slice(0, 5);
      let streakLength = 0;
      while (streakLength < row.form.length && row.form[streakLength] === row.form[0]) {
        streakLength += 1;
      }
      return {
        ...row,
        form,
        streak: row.form.length ? `${row.form[0] === 'W' ? 'В' : 'П'}${streakLength}` : '—',
        diff: row.pf - row.pa,
        pts: row.w * 2 + row.l,
      };
    })
    .sort((a, b) => b.pts - a.pts || b.diff - a.diff || b.pf - a.pf || compareText(a.team, b.team));
}

/** Личные встречи двух команд. */
export function headToHead(matches: ArchivedMatch[], a: string, b: string): ArchivedMatch[] {
  return matches
    .filter(
      (match) =>
        (match.home.name === a && match.away.name === b) ||
        (match.home.name === b && match.away.name === a),
    )
    .sort((x, y) => y.date.localeCompare(x.date));
}

export { fmtDate } from '@/lib/format';
