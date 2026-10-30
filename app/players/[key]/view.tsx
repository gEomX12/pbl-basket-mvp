'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLeague } from '@/lib/providers';
import { aggregatePlayers, efficiency, playerGames, rebTotal } from '@/lib/league-stats';
import { rosterOf } from '@/lib/league-data';
import { fmtDateShort, jersey, mmss, pct, perGame } from '@/lib/format';
import { Card, EmptyState, StatTile, Tabs, TeamBadge, btn } from '@/components/ui';

type Tab = 'season' | 'games' | 'career';

export default function PlayerView({ playerKey }: { playerKey: string }) {
  const key = playerKey;
  const { seasonMatches, allMatches, season } = useLeague();
  const [tab, setTab] = useState<Tab>('season');

  const seasonStats = useMemo(
    () => aggregatePlayers(seasonMatches).find((player) => player.key === key),
    [seasonMatches, key],
  );

  const anyStats = useMemo(
    () => aggregatePlayers(allMatches).find((player) => player.key === key),
    [allMatches, key],
  );

  const stats = seasonStats ?? anyStats;

  const games = useMemo(
    () => playerGames(seasonMatches, key),
    [seasonMatches, key],
  );

  const bySeason = useMemo(() => {
    const seasons = [...new Set(allMatches.map((match) => match.season))].sort().reverse();
    return seasons
      .map((item) => ({
        season: item,
        stats: aggregatePlayers(allMatches.filter((match) => match.season === item)).find(
          (player) => player.key === key,
        ),
      }))
      .filter((item) => item.stats);
  }, [allMatches, key]);

  if (!stats) {
    return (
      <section>
        <Link href="/leaders" className="text-sm text-muted hover:text-accent">← Лидеры</Link>
        <EmptyState text="Игрок не найден." />
      </section>
    );
  }

  const profile = rosterOf(stats.team).find((entry) => entry.name === stats.name);
  const best = games.reduce(
    (acc, game) => (game.player.points > (acc?.player.points ?? -1) ? game : acc),
    games[0] ?? null,
  );

  return (
    <section>
      <Link href={`/teams/${encodeURIComponent(stats.team)}`} className="text-sm text-muted hover:text-accent">
        ← {stats.team}
      </Link>

      <Card className="my-4 flex flex-wrap items-center gap-5 p-5">
        <span className="relative">
          <TeamBadge team={stats.team} size="xl" />
          <span className="absolute -bottom-1 -right-1 flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-surface bg-accent px-1 text-xs font-black text-accentfg">
            {jersey(stats.number)}
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black sm:text-3xl">{stats.name}</h1>
          <p className="text-sm text-muted">
            <Link href={`/teams/${encodeURIComponent(stats.team)}`} className="hover:text-accent">
              {stats.team}
            </Link>
            {profile && ` · ${profile.position}`}
            {profile && profile.born > 0 && ` · ${profile.born} г.р.`}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {seasonStats
              ? `Сезон ${season}: ${stats.games} матч(ей), ${mmss(stats.seconds)} на площадке`
              : `В сезоне ${season} матчей нет — показана статистика за всё время`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/compare?a=${encodeURIComponent(stats.key)}`} className={btn.primary}>
            Сравнить игрока
          </Link>
          <Link href={`/teams/${encodeURIComponent(stats.team)}`} className={btn.ghost}>
            Страница команды
          </Link>
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <StatTile label="Очки" value={perGame(stats.pts, stats.games)} accent />
        <StatTile label="Подборы" value={perGame(stats.reb, stats.games)} />
        <StatTile label="Передачи" value={perGame(stats.ast, stats.games)} />
        <StatTile label="Перехваты" value={perGame(stats.stl, stats.games)} />
        <StatTile label="Блок-шоты" value={perGame(stats.blk, stats.games)} />
        <StatTile label="Потери" value={perGame(stats.to, stats.games)} />
        <StatTile label="2+3 %" value={`${pct(stats.fgm, stats.fga)}%`} />
        <StatTile label="КПИ" value={perGame(stats.eff, stats.games)} />
      </div>

      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'season', label: 'Сезон' },
            { value: 'games', label: 'Матчи' },
            { value: 'career', label: 'По сезонам' },
          ]}
        />
      </div>

      {tab === 'season' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-black">Суммарно за сезон</h2>
            <dl className="space-y-2 text-sm">
              {[
                ['Матчи', stats.games],
                ['Минуты', mmss(stats.seconds)],
                ['Очки', stats.pts],
                ['Подборы (атак. / защ.)', `${stats.reb} (${stats.oreb} / ${stats.dreb})`],
                ['Передачи', stats.ast],
                ['Перехваты', stats.stl],
                ['Блок-шоты', stats.blk],
                ['Потери', stats.to],
                ['Фолы', stats.fouls],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between border-b border-line pb-2">
                  <dt className="text-muted">{label}</dt>
                  <dd className="font-black tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-sm font-black">Реализация</h2>
            <div className="space-y-4">
              {[
                { label: 'С игры', made: stats.fgm, att: stats.fga },
                { label: 'Трёхочковые', made: stats.fg3m, att: stats.fg3a },
                { label: 'Штрафные', made: stats.ftm, att: stats.fta },
              ].map((bar) => {
                const value = pct(bar.made, bar.att);
                return (
                  <div key={bar.label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold">{bar.label}</span>
                      <span className="tabular-nums text-muted">{bar.made}/{bar.att} · {value}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface2">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, value)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {best && (
              <div className="mt-6 rounded-xl border border-line bg-surface2 p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Лучший матч сезона</div>
                <Link href={`/matches/${encodeURIComponent(best.match.id)}`} className="mt-1 block text-sm font-bold hover:text-accent">
                  {best.player.points} очков против «{best.opponent}»
                </Link>
                <div className="text-xs text-muted">
                  {fmtDateShort(best.match.date)} · {best.teamScore}:{best.oppScore}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'games' && (
        <Card className="scroll-thin overflow-x-auto">
          {games.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">В сезоне {season} матчей нет.</p>
          ) : (
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-surface2 text-muted">
                <tr>
                  <th className="px-2 py-2.5 text-left font-bold">Дата</th>
                  <th className="px-2 py-2.5 text-left font-bold">Соперник</th>
                  <th className="px-2 py-2.5 font-bold">Счёт</th>
                  <th className="px-2 py-2.5 font-bold">МИН</th>
                  <th className="px-2 py-2.5 font-bold text-accent">ОЧК</th>
                  <th className="px-2 py-2.5 font-bold">2+3</th>
                  <th className="px-2 py-2.5 font-bold">3О</th>
                  <th className="px-2 py-2.5 font-bold">ШТР</th>
                  <th className="px-2 py-2.5 font-bold">ПБ</th>
                  <th className="px-2 py-2.5 font-bold">АП</th>
                  <th className="px-2 py-2.5 font-bold">ПХ</th>
                  <th className="px-2 py-2.5 font-bold">БШ</th>
                  <th className="px-2 py-2.5 font-bold">ПТ</th>
                  <th className="px-2 py-2.5 font-bold">Ф</th>
                  <th className="px-2 py-2.5 font-bold">КПИ</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => {
                  const won = game.teamScore > game.oppScore;
                  return (
                    <tr key={game.match.id} className="border-t border-line text-center hover:bg-surface2">
                      <td className="px-2 py-2.5 text-left text-muted">{fmtDateShort(game.match.date)}</td>
                      <td className="px-2 py-2.5 text-left">
                        <Link href={`/matches/${encodeURIComponent(game.match.id)}`} className="inline-flex items-center gap-1.5 font-semibold hover:text-accent">
                          <TeamBadge team={game.opponent} size="sm" />
                          {game.opponent}
                        </Link>
                      </td>
                      <td className={`px-2 py-2.5 font-semibold tabular-nums ${won ? 'text-win' : 'text-loss'}`}>
                        {won ? 'В' : 'П'} {game.teamScore}:{game.oppScore}
                      </td>
                      <td className="px-2 py-2.5 tabular-nums text-muted">{mmss(game.player.seconds)}</td>
                      <td className="px-2 py-2.5 font-black tabular-nums text-accent">{game.player.points}</td>
                      <td className="px-2 py-2.5 tabular-nums">{game.player.fg_made}/{game.player.fg_att}</td>
                      <td className="px-2 py-2.5 tabular-nums">{game.player.fg3_made}/{game.player.fg3_att}</td>
                      <td className="px-2 py-2.5 tabular-nums">{game.player.ft_made}/{game.player.ft_att}</td>
                      <td className="px-2 py-2.5 tabular-nums">{rebTotal(game.player)}</td>
                      <td className="px-2 py-2.5 tabular-nums">{game.player.ast}</td>
                      <td className="px-2 py-2.5 tabular-nums">{game.player.stl}</td>
                      <td className="px-2 py-2.5 tabular-nums">{game.player.blk}</td>
                      <td className="px-2 py-2.5 tabular-nums">{game.player.to}</td>
                      <td className="px-2 py-2.5 tabular-nums">{game.player.fouls}</td>
                      <td className="px-2 py-2.5 font-semibold tabular-nums">{efficiency(game.player)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'career' && (
        <Card className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface2 text-muted">
              <tr>
                <th className="px-3 py-2.5 text-left font-bold">Сезон</th>
                <th className="px-3 py-2.5 font-bold">И</th>
                <th className="px-3 py-2.5 font-bold text-accent">ОЧК</th>
                <th className="px-3 py-2.5 font-bold">ПБ</th>
                <th className="px-3 py-2.5 font-bold">АП</th>
                <th className="px-3 py-2.5 font-bold">ПХ</th>
                <th className="px-3 py-2.5 font-bold">БШ</th>
                <th className="px-3 py-2.5 font-bold">2+3%</th>
                <th className="px-3 py-2.5 font-bold">3О%</th>
                <th className="px-3 py-2.5 font-bold">КПИ</th>
              </tr>
            </thead>
            <tbody>
              {bySeason.map(({ season: item, stats: row }) => (
                <tr key={item} className="border-t border-line text-center hover:bg-surface2">
                  <td className="px-3 py-2.5 text-left font-bold">{item}</td>
                  <td className="px-3 py-2.5 tabular-nums">{row!.games}</td>
                  <td className="px-3 py-2.5 font-black tabular-nums text-accent">{perGame(row!.pts, row!.games)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{perGame(row!.reb, row!.games)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{perGame(row!.ast, row!.games)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{perGame(row!.stl, row!.games)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{perGame(row!.blk, row!.games)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{pct(row!.fgm, row!.fga)}%</td>
                  <td className="px-3 py-2.5 tabular-nums">{pct(row!.fg3m, row!.fg3a)}%</td>
                  <td className="px-3 py-2.5 tabular-nums">{perGame(row!.eff, row!.games)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </section>
  );
}
