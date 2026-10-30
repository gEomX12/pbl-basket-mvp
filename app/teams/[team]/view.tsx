'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAuth, useLeague } from '@/lib/providers';
import { computeStandings } from '@/lib/standings';
import { aggregatePlayers } from '@/lib/league-stats';
import { rosterOf, teamInfo } from '@/lib/league-data';
import { compareText, fmtDate, fmtDateShort, jersey, mmss, pct, perGame, signed } from '@/lib/format';
import {
  Card,
  EmptyState,
  FormDots,
  StatTile,
  StatusBadge,
  Tabs,
  TeamBadge,
  btn,
} from '@/components/ui';

type Tab = 'overview' | 'roster' | 'games' | 'stats';

export default function TeamView({ teamName }: { teamName: string }) {
  const { seasonMatches, allMatches, season } = useLeague();
  const { favorites, toggleFavorite } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');

  const info = teamInfo(teamName);

  const teamMatches = useMemo(
    () =>
      seasonMatches
        .filter((match) => match.home.name === teamName || match.away.name === teamName)
        .sort((a, b) => compareText(b.date, a.date)),
    [seasonMatches, teamName],
  );

  const standings = useMemo(() => computeStandings(seasonMatches), [seasonMatches]);
  const record = standings.find((row) => row.team === teamName);
  const place = standings.findIndex((row) => row.team === teamName) + 1;

  const roster = useMemo(() => {
    const stats = aggregatePlayers(seasonMatches).filter((player) => player.team === teamName);
    return rosterOf(teamName).map((entry) => ({
      entry,
      stats: stats.find((player) => player.name === entry.name) ?? null,
    }));
  }, [seasonMatches, teamName]);

  const played = teamMatches.filter((match) => match.status === 'final');
  const next = teamMatches.filter((match) => match.status === 'scheduled').at(-1) ?? null;

  const splits = useMemo(() => {
    let homeW = 0;
    let homeL = 0;
    let awayW = 0;
    let awayL = 0;
    for (const match of played) {
      const isHome = match.home.name === teamName;
      const won = isHome ? match.home.score > match.away.score : match.away.score > match.home.score;
      if (isHome) {
        if (won) homeW += 1;
        else homeL += 1;
      } else if (won) {
        awayW += 1;
      } else {
        awayL += 1;
      }
    }
    return { homeW, homeL, awayW, awayL };
  }, [played, teamName]);

  const allTime = useMemo(
    () =>
      allMatches.filter(
        (match) =>
          match.status === 'final' &&
          (match.home.name === teamName || match.away.name === teamName),
      ).length,
    [allMatches, teamName],
  );

  if (!info) {
    return (
      <section>
        <Link href="/teams" className="text-sm text-muted hover:text-accent">← Все команды</Link>
        <EmptyState text="Команда не найдена." />
      </section>
    );
  }

  const isFavorite = favorites.includes(teamName);
  const ppg = record && record.g ? perGame(record.pf, record.g) : 0;
  const papg = record && record.g ? perGame(record.pa, record.g) : 0;

  return (
    <section>
      <Link href="/teams" className="text-sm text-muted hover:text-accent">← Все команды</Link>

      <Card className="my-4 overflow-hidden">
        <div
          className="h-20"
          style={{ background: `linear-gradient(120deg, ${info.color}, transparent)` }}
        />
        <div className="flex flex-wrap items-end gap-4 px-5 pb-5">
          <div className="-mt-10">
            <TeamBadge team={teamName} size="xl" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black sm:text-3xl">{teamName}</h1>
            <p className="text-sm text-muted">
              {info.division} · {info.arena}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {info.coach ? `Тренер: ${info.coach}` : 'Тренер не указан'}
              {info.assistant ? ` · Ассистент: ${info.assistant}` : ''} · матчей в лиге: {allTime}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleFavorite(teamName)}
              className={isFavorite ? btn.primary : btn.ghost}
            >
              {isFavorite ? '★ В избранном' : '☆ В избранное'}
            </button>
            <Link href={`/schedule`} className={btn.ghost}>Матчи тура</Link>
          </div>
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <StatTile label="Место" value={place || '—'} accent />
        <StatTile label="Очки" value={record?.pts ?? 0} />
        <StatTile label="В — П" value={record ? `${record.w}—${record.l}` : '0—0'} />
        <StatTile label="Очков за игру" value={ppg} />
        <StatTile label="Пропущено" value={papg} />
        <StatTile label="Разница" value={signed(record?.diff ?? 0)} />
      </div>

      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'overview', label: 'Обзор' },
            { value: 'roster', label: 'Состав' },
            { value: 'games', label: 'Матчи' },
            { value: 'stats', label: 'Статистика' },
          ]}
        />
      </div>

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* min-w-0: иначе содержимое не даёт колонке сжаться на узком экране */}
          <Card className="min-w-0 p-5">
            <h2 className="mb-3 text-sm font-black">Форма команды</h2>
            {record && record.form.length > 0 ? (
              <>
                <FormDots form={record.form} />
                <p className="mt-3 text-xs text-muted">
                  Серия: {record.streak} · дома {splits.homeW}—{splits.homeL} · в гостях {splits.awayW}—{splits.awayL}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted">В сезоне {season} матчей ещё не было.</p>
            )}

            {next && (
              <div className="mt-5 rounded-xl border border-line bg-surface2 p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Следующий матч</div>
                <Link
                  href={`/matches/${encodeURIComponent(next.id)}`}
                  className="mt-1 block text-sm font-bold hover:text-accent"
                >
                  {next.home.name} — {next.away.name}
                </Link>
                <div className="text-xs text-muted">
                  {fmtDate(next.date)} · {next.time} · {next.venue}
                </div>
              </div>
            )}
          </Card>

          <Card className="min-w-0 p-5">
            <h2 className="mb-3 text-sm font-black">Лидеры команды</h2>
            {roster.filter((item) => item.stats).length === 0 ? (
              <p className="text-xs text-muted">Статистика появится после первого матча.</p>
            ) : (
              <ol className="space-y-2">
                {roster
                  .filter((item) => item.stats)
                  .sort((a, b) => (b.stats!.pts / b.stats!.games) - (a.stats!.pts / a.stats!.games))
                  .slice(0, 5)
                  .map(({ entry, stats }, index) => (
                    <li key={entry.name}>
                      <Link
                        href={`/players/${encodeURIComponent(stats!.key)}`}
                        className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface2"
                      >
                        <span className="w-4 text-xs font-black text-muted">{index + 1}</span>
                        <span className="w-9 text-center text-xs font-bold text-accent">{jersey(entry.number)}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{entry.name}</span>
                        <span className="hidden shrink-0 text-xs text-muted sm:inline">{entry.position}</span>
                        <span className="w-10 text-right font-black tabular-nums text-accent">
                          {perGame(stats!.pts, stats!.games)}
                        </span>
                      </Link>
                    </li>
                  ))}
              </ol>
            )}
          </Card>
        </div>
      )}

      {tab === 'roster' && (
        <Card className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-surface2 text-muted">
              <tr>
                <th className="px-2 py-2.5 text-left font-bold">№</th>
                <th className="px-2 py-2.5 text-left font-bold">Игрок</th>
                <th className="px-2 py-2.5 text-left font-bold">Амплуа</th>
                <th className="px-2 py-2.5 font-bold">Г.р.</th>
                <th className="px-2 py-2.5 font-bold">И</th>
                <th className="px-2 py-2.5 font-bold">Мин</th>
                <th className="px-2 py-2.5 font-bold text-accent">ОЧК</th>
                <th className="px-2 py-2.5 font-bold">ПБ</th>
                <th className="px-2 py-2.5 font-bold">АП</th>
                <th className="px-2 py-2.5 font-bold">ПХ</th>
                <th className="px-2 py-2.5 font-bold">БШ</th>
                <th className="px-2 py-2.5 font-bold">2+3%</th>
                <th className="px-2 py-2.5 font-bold">3О%</th>
              </tr>
            </thead>
            <tbody>
              {roster.map(({ entry, stats }) => (
                <tr key={entry.name} className="border-t border-line text-center hover:bg-surface2">
                  <td className="px-2 py-2.5 text-left font-bold text-accent">{jersey(entry.number)}</td>
                  <td className="px-2 py-2.5 text-left font-semibold">
                    {stats ? (
                      <Link href={`/players/${encodeURIComponent(stats.key)}`} className="hover:text-accent">
                        {entry.name}
                      </Link>
                    ) : (
                      entry.name
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-left text-muted">{entry.position}</td>
                  <td className="px-2 py-2.5 tabular-nums text-muted">{entry.born}</td>
                  <td className="px-2 py-2.5 tabular-nums">{stats?.games ?? 0}</td>
                  <td className="px-2 py-2.5 tabular-nums">
                    {stats ? mmss(Math.round(stats.seconds / Math.max(1, stats.games))) : '—'}
                  </td>
                  <td className="px-2 py-2.5 font-black tabular-nums text-accent">
                    {stats ? perGame(stats.pts, stats.games) : '—'}
                  </td>
                  <td className="px-2 py-2.5 tabular-nums">{stats ? perGame(stats.reb, stats.games) : '—'}</td>
                  <td className="px-2 py-2.5 tabular-nums">{stats ? perGame(stats.ast, stats.games) : '—'}</td>
                  <td className="px-2 py-2.5 tabular-nums">{stats ? perGame(stats.stl, stats.games) : '—'}</td>
                  <td className="px-2 py-2.5 tabular-nums">{stats ? perGame(stats.blk, stats.games) : '—'}</td>
                  <td className="px-2 py-2.5 tabular-nums">{stats ? `${pct(stats.fgm, stats.fga)}%` : '—'}</td>
                  <td className="px-2 py-2.5 tabular-nums">{stats ? `${pct(stats.fg3m, stats.fg3a)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'games' && (
        <Card className="overflow-hidden">
          {teamMatches.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Матчей в сезоне {season} нет.</p>
          ) : (
            <ul className="divide-y divide-line">
              {teamMatches.map((match) => {
                const isHome = match.home.name === teamName;
                const opponent = isHome ? match.away.name : match.home.name;
                const own = isHome ? match.home.score : match.away.score;
                const other = isHome ? match.away.score : match.home.score;
                const won = own > other;
                return (
                  <li key={match.id}>
                    <Link
                      href={`/matches/${encodeURIComponent(match.id)}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-surface2"
                    >
                      <span className="w-14 shrink-0 text-xs text-muted">{fmtDateShort(match.date)}</span>
                      <span className="w-6 shrink-0 text-center text-[11px] font-bold text-muted">
                        {isHome ? 'Д' : 'Г'}
                      </span>
                      <TeamBadge team={opponent} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{opponent}</span>
                      {match.status === 'scheduled' ? (
                        <span className="text-xs text-muted">{match.time}</span>
                      ) : (
                        <span className={`text-sm font-black tabular-nums ${won ? 'text-win' : 'text-loss'}`}>
                          {won ? 'В' : 'П'} {own}:{other}
                        </span>
                      )}
                      <StatusBadge status={match.status} period={match.period} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {tab === 'stats' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="min-w-0 p-5">
            <h2 className="mb-4 text-sm font-black">Командные показатели за игру</h2>
            {played.length === 0 ? (
              <p className="text-xs text-muted">Нет сыгранных матчей.</p>
            ) : (
              <dl className="space-y-2 text-sm">
                {[
                  ['Очки', ppg],
                  ['Пропущено', papg],
                  ['Разница', signed(Math.round((ppg - papg) * 10) / 10)],
                  ['Подборы', perGame(roster.reduce((sum, r) => sum + (r.stats?.reb ?? 0), 0), played.length)],
                  ['Передачи', perGame(roster.reduce((sum, r) => sum + (r.stats?.ast ?? 0), 0), played.length)],
                  ['Перехваты', perGame(roster.reduce((sum, r) => sum + (r.stats?.stl ?? 0), 0), played.length)],
                  ['Потери', perGame(roster.reduce((sum, r) => sum + (r.stats?.to ?? 0), 0), played.length)],
                  ['Фолы', perGame(roster.reduce((sum, r) => sum + (r.stats?.fouls ?? 0), 0), played.length)],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex items-center justify-between border-b border-line pb-2">
                    <dt className="text-muted">{label}</dt>
                    <dd className="font-black tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>

          <Card className="min-w-0 p-5">
            <h2 className="mb-4 text-sm font-black">Реализация бросков</h2>
            {(() => {
              const totals = roster.reduce(
                (acc, item) => ({
                  fgm: acc.fgm + (item.stats?.fgm ?? 0),
                  fga: acc.fga + (item.stats?.fga ?? 0),
                  fg3m: acc.fg3m + (item.stats?.fg3m ?? 0),
                  fg3a: acc.fg3a + (item.stats?.fg3a ?? 0),
                  ftm: acc.ftm + (item.stats?.ftm ?? 0),
                  fta: acc.fta + (item.stats?.fta ?? 0),
                }),
                { fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0 },
              );
              const bars = [
                { label: 'С игры', made: totals.fgm, att: totals.fga },
                { label: '3 очка', made: totals.fg3m, att: totals.fg3a },
                { label: 'Штрафные', made: totals.ftm, att: totals.fta },
              ];
              return (
                <div className="space-y-4">
                  {bars.map((bar) => {
                    const value = pct(bar.made, bar.att);
                    return (
                      <div key={bar.label}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-semibold">{bar.label}</span>
                          <span className="tabular-nums text-muted">
                            {bar.made}/{bar.att} · {value}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-surface2">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${Math.min(100, value)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </Card>
        </div>
      )}
    </section>
  );
}
