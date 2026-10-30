import { rebTotal } from '@/lib/league-stats';
import type {
  ArchivedMatch,
  BoxStatAction,
  LeagueLeader,
  Player,
  ScoringPoints,
} from '@/types/match';

export { createPlayer } from '@/lib/league-data';
export { rebTotal, efficiency } from '@/lib/league-stats';
export { formatPct } from '@/lib/format';

/** Результативный бросок: очки + попытка + попадание. */
export function applyMadeShot(player: Player, points: ScoringPoints): Player {
  const next: Player = { ...player, points: player.points + points };
  if (points === 1) {
    next.ft_made += 1;
    next.ft_att += 1;
  } else {
    next.fg_made += 1;
    next.fg_att += 1;
    if (points === 3) {
      next.fg3_made += 1;
      next.fg3_att += 1;
    }
  }
  return next;
}

/** Промах: только попытка. */
export function applyMissedShot(player: Player, points: ScoringPoints): Player {
  const next: Player = { ...player };
  if (points === 1) {
    next.ft_att += 1;
  } else {
    next.fg_att += 1;
    if (points === 3) next.fg3_att += 1;
  }
  return next;
}

export function applyFoulToPlayer(player: Player): Player | null {
  if (player.fouls >= 5) return null;
  return { ...player, fouls: player.fouls + 1 };
}

export function applyBoxStat(player: Player, action: BoxStatAction): Player {
  return { ...player, [action]: player[action] + 1 };
}

function roundAvg(total: number, games: number): number {
  if (games === 0) return 0;
  return Math.round((total / games) * 10) / 10;
}

export function aggregateLeagueLeaders(matches: ArchivedMatch[]): LeagueLeader[] {
  const byKey = new Map<string, LeagueLeader>();

  for (const match of matches) {
    if (match.status === 'scheduled') continue;
    for (const team of [match.home, match.away]) {
      for (const player of team.players) {
        const key = `${team.name}::${player.name}`;
        const current = byKey.get(key) ?? {
          key, name: player.name, team: team.name,
          games: 0, points: 0, ast: 0, reb: 0, ppg: 0, apg: 0, rpg: 0,
        };

        current.games += 1;
        current.points += player.points;
        current.ast += player.ast;
        current.reb += rebTotal(player);
        byKey.set(key, current);
      }
    }
  }

  return [...byKey.values()].map((leader) => ({
    ...leader,
    ppg: roundAvg(leader.points, leader.games),
    apg: roundAvg(leader.ast, leader.games),
    rpg: roundAvg(leader.reb, leader.games),
  }));
}

export function topLeaders(
  leaders: LeagueLeader[],
  metric: 'ppg' | 'apg' | 'rpg',
  limit = 3,
): LeagueLeader[] {
  return [...leaders]
    .sort((a, b) => b[metric] - a[metric] || b.points - a.points)
    .slice(0, limit);
}
