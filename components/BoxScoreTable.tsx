'use client';

import Link from 'next/link';
import { efficiency, playerKey, rebTotal, teamTotals } from '@/lib/league-stats';
import { formatPct, jersey, mmss } from '@/lib/format';
import { TeamBadge } from '@/components/ui';
import type { Player, TeamState } from '@/types/match';

const HEAD = [
  { label: '№', align: 'left' },
  { label: 'Игрок', align: 'left' },
  { label: 'МИН', align: 'center' },
  { label: 'ОЧК', align: 'center' },
  { label: '2+3', align: 'center' },
  { label: '%', align: 'center' },
  { label: '3О', align: 'center' },
  { label: 'ШТР', align: 'center' },
  { label: 'АТБ', align: 'center' },
  { label: 'ЗБ', align: 'center' },
  { label: 'ПБ', align: 'center' },
  { label: 'АП', align: 'center' },
  { label: 'ПХ', align: 'center' },
  { label: 'БШ', align: 'center' },
  { label: 'ПТ', align: 'center' },
  { label: 'Ф', align: 'center' },
  { label: 'КПИ', align: 'center' },
] as const;

export function TeamBox({ team, linkPlayers = true }: { team: TeamState; linkPlayers?: boolean }) {
  const totals = teamTotals(team.players);

  return (
    <div className="card scroll-thin overflow-x-auto">
      <div className="flex items-center justify-between border-b border-line bg-surface2 px-4 py-3">
        <div className="flex items-center gap-2">
          <TeamBadge team={team.name} size="sm" />
          <h3 className="font-black">{team.name}</h3>
        </div>
        <span className="text-2xl font-black tabular-nums text-accent">{team.score}</span>
      </div>

      <table className="w-full min-w-[900px] text-xs tabular-nums">
        <thead className="bg-surface text-muted">
          <tr>
            {HEAD.map((column) => (
              <th
                key={column.label}
                className={`whitespace-nowrap px-2.5 py-2 font-bold ${
                  column.align === 'left' ? 'text-left' : 'text-center'
                }`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {team.players.map((player: Player) => (
            <tr key={player.id} className="border-t border-line text-center hover:bg-surface2">
              <td className="px-2.5 py-2 text-left font-bold text-accent">{jersey(player.number)}</td>
              <td className="whitespace-nowrap px-2.5 py-2 text-left font-semibold">
                {linkPlayers ? (
                  <Link
                    href={`/players/${encodeURIComponent(playerKey(team.name, player.name))}`}
                    className="hover:text-accent"
                  >
                    {player.name}
                  </Link>
                ) : (
                  player.name
                )}
              </td>
              <td className="px-2.5 py-2 text-muted">{mmss(player.seconds)}</td>
              <td className="px-2.5 py-2 font-black text-accent">{player.points}</td>
              <td className="px-2.5 py-2">{player.fg_made}/{player.fg_att}</td>
              <td className="px-2.5 py-2 text-muted">{formatPct(player.fg_made, player.fg_att)}</td>
              <td className="px-2.5 py-2">{player.fg3_made}/{player.fg3_att}</td>
              <td className="px-2.5 py-2">{player.ft_made}/{player.ft_att}</td>
              <td className="px-2.5 py-2">{player.reb_off}</td>
              <td className="px-2.5 py-2">{player.reb_def}</td>
              <td className="px-2.5 py-2 font-semibold">{rebTotal(player)}</td>
              <td className="px-2.5 py-2">{player.ast}</td>
              <td className="px-2.5 py-2">{player.stl}</td>
              <td className="px-2.5 py-2">{player.blk}</td>
              <td className="px-2.5 py-2">{player.to}</td>
              <td className={`px-2.5 py-2 ${player.fouls >= 5 ? 'font-bold text-loss' : ''}`}>{player.fouls}</td>
              <td className="px-2.5 py-2 font-semibold">{efficiency(player)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-line bg-surface2 text-center font-black">
            <td className="px-2.5 py-2 text-left" colSpan={2}>Итого</td>
            <td className="px-2.5 py-2" />
            <td className="px-2.5 py-2 text-accent">{totals.pts}</td>
            <td className="px-2.5 py-2">{totals.fgm}/{totals.fga}</td>
            <td className="px-2.5 py-2">{formatPct(totals.fgm, totals.fga)}</td>
            <td className="px-2.5 py-2">{totals.fg3m}/{totals.fg3a}</td>
            <td className="px-2.5 py-2">{totals.ftm}/{totals.fta}</td>
            <td className="px-2.5 py-2" colSpan={2} />
            <td className="px-2.5 py-2">{totals.reb}</td>
            <td className="px-2.5 py-2">{totals.ast}</td>
            <td className="px-2.5 py-2">{totals.stl}</td>
            <td className="px-2.5 py-2">{totals.blk}</td>
            <td className="px-2.5 py-2">{totals.to}</td>
            <td className="px-2.5 py-2">{totals.fouls}</td>
            <td className="px-2.5 py-2" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function BoxScoreTable({
  home,
  away,
  linkPlayers = true,
}: {
  home: TeamState;
  away: TeamState;
  linkPlayers?: boolean;
}) {
  return (
    <div className="space-y-4">
      <TeamBox team={home} linkPlayers={linkPlayers} />
      <TeamBox team={away} linkPlayers={linkPlayers} />
    </div>
  );
}
