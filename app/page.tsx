'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLeague } from '@/lib/providers';
import { computeStandings, type StandingRow } from '@/lib/standings';
import { aggregatePlayers } from '@/lib/league-stats';
import { compareText, fmtDateShort, perGame, signed } from '@/lib/format';
import {
  Card,
  EmptyState,
  FormDots,
  SectionTitle,
  StatusBadge,
  Tabs,
  TeamBadge,
  TeamLink,
  btn,
} from '@/components/ui';

type SortKey = keyof Pick<StandingRow, 'pts' | 'w' | 'l' | 'pf' | 'pa' | 'diff' | 'g'>;

const COLUMNS: { key: SortKey; label: string; title: string }[] = [
  { key: 'g', label: 'И', title: 'Игры' },
  { key: 'w', label: 'В', title: 'Победы' },
  { key: 'l', label: 'П', title: 'Поражения' },
  { key: 'pf', label: 'Заб', title: 'Забито очков' },
  { key: 'pa', label: 'Проп', title: 'Пропущено очков' },
  { key: 'diff', label: '+/−', title: 'Разница очков' },
  { key: 'pts', label: 'О', title: 'Очки: победа — 2, поражение — 1' },
];

export default function StandingsPage() {
  const { matches, seasonMatches, stage, setStage, season, division, ready } = useLeague();
  const [sortKey, setSortKey] = useState<SortKey>('pts');

  const rows = useMemo(() => computeStandings(matches), [matches]);

  const sorted = useMemo(() => {
    if (sortKey === 'pts') return rows;
    return [...rows].sort((a, b) => b[sortKey] - a[sortKey] || b.diff - a.diff);
  }, [rows, sortKey]);

  const upcoming = useMemo(
    () =>
      seasonMatches
        .filter((match) => match.status === 'scheduled')
        .sort((a, b) => compareText(a.date, b.date))
        .slice(0, 5),
    [seasonMatches],
  );

  const live = useMemo(
    () => seasonMatches.filter((match) => match.status === 'live'),
    [seasonMatches],
  );

  const scorers = useMemo(
    () =>
      aggregatePlayers(seasonMatches)
        .filter((player) => player.games >= 2)
        .sort((a, b) => b.pts / b.games - a.pts / a.games)
        .slice(0, 5),
    [seasonMatches],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* min-w-0: иначе таблица с min-width не даёт колонке сжаться и страница едет вбок */}
      <section className="min-w-0">
        <SectionTitle
          title="Турнирная таблица"
          subtitle={`${division} · сезон ${season} · победа — 2 очка, поражение — 1`}
        />

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Tabs
            value={stage}
            onChange={setStage}
            options={[
              { value: 'all', label: 'Все матчи' },
              { value: 'regular', label: 'Регулярка' },
              { value: 'playoff', label: 'Плей-офф' },
              { value: 'friendly', label: 'Товарищеские' },
            ]}
          />
          <Link href="/schedule" className={btn.subtle}>
            Всё расписание →
          </Link>
        </div>

        {live.length > 0 && (
          <div className="mb-4 space-y-2">
            {live.map((match) => (
              <Link
                key={match.id}
                href={`/stream/${encodeURIComponent(match.id)}`}
                className="card flex items-center gap-3 px-4 py-3 transition hover:border-accent"
              >
                <StatusBadge status="live" period={match.period} />
                <span className="flex min-w-0 flex-1 items-center justify-center gap-3 text-sm font-bold">
                  <span className="truncate">{match.home.name}</span>
                  <span className="rounded-md bg-surface2 px-2 py-0.5 tabular-nums">
                    {match.home.score} : {match.away.score}
                  </span>
                  <span className="truncate">{match.away.name}</span>
                </span>
                <span className="hidden text-xs font-bold text-accent sm:block">Смотреть →</span>
              </Link>
            ))}
          </div>
        )}

        {rows.length === 0 ? (
          <EmptyState
            text={
              ready
                ? 'В выбранном дивизионе и сезоне ещё нет сыгранных матчей.'
                : 'Загрузка…'
            }
          />
        ) : (
          <div className="card scroll-thin overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface2 text-muted">
                <tr>
                  <th className="px-3 py-2.5 text-left font-bold">#</th>
                  <th className="px-3 py-2.5 text-left font-bold">Команда</th>
                  {COLUMNS.map((column) => (
                    <th key={column.key} className="px-2 py-2.5 font-bold">
                      <button
                        type="button"
                        title={`${column.title} — нажмите для сортировки`}
                        onClick={() => setSortKey(column.key)}
                        className={sortKey === column.key ? 'text-accent' : 'hover:text-fg'}
                      >
                        {column.label}
                      </button>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 font-bold">Форма</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, index) => (
                  <tr
                    key={row.team}
                    className="border-t border-line text-center transition hover:bg-surface2"
                  >
                    <td className="px-3 py-2.5 text-left">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-black ${
                          index < 4 ? 'bg-accentsoft text-accent' : 'text-muted'
                        }`}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-left">
                      <TeamLink team={row.team} />
                    </td>
                    <td className="px-2 py-2.5 tabular-nums">{row.g}</td>
                    <td className="px-2 py-2.5 font-semibold tabular-nums text-win">{row.w}</td>
                    <td className="px-2 py-2.5 tabular-nums text-loss">{row.l}</td>
                    <td className="px-2 py-2.5 tabular-nums">{row.pf}</td>
                    <td className="px-2 py-2.5 tabular-nums">{row.pa}</td>
                    <td className={`px-2 py-2.5 tabular-nums ${row.diff >= 0 ? 'text-win' : 'text-loss'}`}>
                      {signed(row.diff)}
                    </td>
                    <td className="px-2 py-2.5 text-base font-black tabular-nums text-accent">{row.pts}</td>
                    <td className="px-3 py-2.5">
                      <FormDots form={row.form} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-muted">
          И — игры · В — победы · П — поражения · Заб/Проп — очки · +/− — разница · О — очки в таблице.
          Первые четыре команды выходят в плей-офф.
        </p>
      </section>

      <aside className="min-w-0 space-y-4">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-black">Ближайшие матчи</h2>
            <Link href="/schedule" className="text-[11px] font-bold text-accent">Все</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted">Матчи не запланированы</p>
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map((match) => (
                <li key={match.id}>
                  <Link href={`/matches/${encodeURIComponent(match.id)}`} className="block px-4 py-3 hover:bg-surface2">
                    <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted">
                      <span>{fmtDateShort(match.date)} · {match.time}</span>
                      <span className="truncate">{match.venue}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <TeamBadge team={match.home.name} size="sm" />
                      <span className="truncate">{match.home.name}</span>
                      <span className="text-muted">—</span>
                      <span className="truncate">{match.away.name}</span>
                      <TeamBadge team={match.away.name} size="sm" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-black">Бомбардиры</h2>
            <Link href="/leaders" className="text-[11px] font-bold text-accent">Все</Link>
          </div>
          {scorers.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted">Пока нет данных</p>
          ) : (
            <ol className="divide-y divide-line">
              {scorers.map((player, index) => (
                <li key={player.key}>
                  <Link
                    href={`/players/${encodeURIComponent(player.key)}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface2"
                  >
                    <span className="w-4 text-center text-xs font-black text-muted">{index + 1}</span>
                    <TeamBadge team={player.team} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold">{player.name}</span>
                      <span className="block truncate text-[11px] text-muted">{player.team}</span>
                    </span>
                    <span className="font-black tabular-nums text-accent">
                      {perGame(player.pts, player.games)}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-black">Хотите играть в ПБЛ?</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Приём заявок на сезон открыт. Заполните форму — мы свяжемся с капитаном команды.
          </p>
          <Link href="/request" className={`${btn.primary} mt-3 w-full`}>
            Подать заявку
          </Link>
        </Card>
      </aside>
    </div>
  );
}
