import type { ArchivedMatch, Player } from '@/types/match';

export type PlayerSeason = {
  key: string;
  name: string;
  team: string;
  division: string;
  number: number;
  games: number;
  pts: number;
  reb: number;
  oreb: number;
  dreb: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  fouls: number;
  fgm: number;
  fga: number;
  fg3m: number;
  fg3a: number;
  ftm: number;
  fta: number;
  seconds: number;
  /** Сумма очков эффективности (EFF) за сезон */
  eff: number;
};

export const playerKey = (team: string, name: string) => `${team}::${name}`;

export const rebTotal = (player: Player) => player.reb_off + player.reb_def;

/** Индекс эффективности FIBA. */
export function efficiency(player: Player): number {
  return (
    player.points +
    rebTotal(player) +
    player.ast +
    player.stl +
    player.blk -
    (player.fg_att - player.fg_made) -
    (player.ft_att - player.ft_made) -
    player.to
  );
}

export function aggregatePlayers(matches: ArchivedMatch[]): PlayerSeason[] {
  const map = new Map<string, PlayerSeason>();
  const finals = matches
    .filter((match) => match.status === 'final' || match.status === 'live')
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const match of finals) {
    for (const side of [match.home, match.away]) {
      for (const player of side.players) {
        const key = playerKey(side.name, player.name);
        const current: PlayerSeason = map.get(key) ?? {
          key, name: player.name, team: side.name, division: match.division,
          number: player.number, games: 0, pts: 0, reb: 0, oreb: 0, dreb: 0,
          ast: 0, stl: 0, blk: 0, to: 0, fouls: 0,
          fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0, seconds: 0, eff: 0,
        };

        current.number = player.number;
        current.games += 1;
        current.pts += player.points;
        current.oreb += player.reb_off;
        current.dreb += player.reb_def;
        current.reb += rebTotal(player);
        current.ast += player.ast;
        current.stl += player.stl;
        current.blk += player.blk;
        current.to += player.to;
        current.fouls += player.fouls;
        current.fgm += player.fg_made;
        current.fga += player.fg_att;
        current.fg3m += player.fg3_made;
        current.fg3a += player.fg3_att;
        current.ftm += player.ft_made;
        current.fta += player.ft_att;
        current.seconds += player.seconds;
        current.eff += efficiency(player);
        map.set(key, current);
      }
    }
  }

  return [...map.values()];
}

export type PlayerGame = {
  match: ArchivedMatch;
  team: string;
  opponent: string;
  teamScore: number;
  oppScore: number;
  player: Player;
};

export function playerGames(matches: ArchivedMatch[], key: string): PlayerGame[] {
  const out: PlayerGame[] = [];
  for (const match of matches) {
    if (match.status === 'scheduled') continue;
    const sides = [
      { side: match.home, other: match.away },
      { side: match.away, other: match.home },
    ];
    for (const { side, other } of sides) {
      const player = side.players.find((item) => playerKey(side.name, item.name) === key);
      if (player) {
        out.push({
          match,
          team: side.name,
          opponent: other.name,
          teamScore: side.score,
          oppScore: other.score,
          player,
        });
      }
    }
  }
  return out.sort((a, b) => b.match.date.localeCompare(a.match.date));
}

export type TeamTotals = {
  pts: number; reb: number; ast: number; stl: number; blk: number; to: number;
  fgm: number; fga: number; fg3m: number; fg3a: number; ftm: number; fta: number; fouls: number;
};

export function teamTotals(players: Player[]): TeamTotals {
  return players.reduce<TeamTotals>(
    (acc, player) => ({
      pts: acc.pts + player.points,
      reb: acc.reb + rebTotal(player),
      ast: acc.ast + player.ast,
      stl: acc.stl + player.stl,
      blk: acc.blk + player.blk,
      to: acc.to + player.to,
      fgm: acc.fgm + player.fg_made,
      fga: acc.fga + player.fg_att,
      fg3m: acc.fg3m + player.fg3_made,
      fg3a: acc.fg3a + player.fg3_att,
      ftm: acc.ftm + player.ft_made,
      fta: acc.fta + player.ft_att,
      fouls: acc.fouls + player.fouls,
    }),
    { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 0, fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0, fouls: 0 },
  );
}

export { safeDecode, perGame, pct } from '@/lib/format';
