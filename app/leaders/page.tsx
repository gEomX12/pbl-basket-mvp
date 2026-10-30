'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLeague } from '@/lib/providers';
import { aggregatePlayers } from '@/lib/league-stats';
import { mmss, pct } from '@/lib/format';
import { Card, EmptyState, SectionTitle, Tabs, TeamBadge, btn, inputClass } from '@/components/ui';

type Mode = 'avg' | 'total';

type Row = {
  key: string;
  name: string;
  team: string;
  number: number;
  games: number;
  min: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  eff: number;
  fgp: number;
  fg3p: number;
  ftp: number;
};

type SortKey = keyof Omit<Row, 'key' | 'name' | 'team' | 'number'>;

const COLUMNS: { key: SortKey; label: string; title: string }[] = [
  { key: 'games', label: 'И', title: 'Игры' },
  { key: 'min', label: 'МИН', title: 'Минуты' },
  { key: 'pts', label: 'ОЧК', title: 'Очки' },
  { key: 'reb', label: 'ПБ', title: 'Подборы' },
  { key: 'ast', label: 'АП', title: 'Передачи' },
  { key: 'stl', label: 'ПХ', title: 'Перехваты' },
  { key: 'blk', label: 'БШ', title: 'Блок-шоты' },
  { key: 'to', label: 'ПТ', title: 'Потери' },
  { key: 'eff', label: 'КПИ', title: 'Коэффициент полезности' },
  { key: 'fgp', label: '2+3%', title: 'Процент с игры' },
  { key: 'fg3p', label: '3О%', title: 'Процент трёхочковых' },
  { key: 'ftp', label: 'ШТР%', title: 'Процент штрафных' },
];

const CARDS: { key: SortKey; title: string; unit: string }[] = [
  { key: 'pts', title: 'Очки', unit: 'ОЧК' },
  { key: 'reb', title: 'Подборы', unit: 'ПБ' },
  { key: 'ast', title: 'Передачи', unit: 'АП' },
  { key: 'stl', title: 'Перехваты', unit: 'ПХ' },
  { key: 'blk', title: 'Блок-шоты', unit: 'БШ' },
  { key: 'eff', title: 'Полезность', unit: 'КПИ' },
];

export default function LeadersPage() {
  const { seasonMatches, stage, setStage, season, division } = useLeague();
  const [mode, setMode] = useState<Mode>('avg');
  const [sortKey, setSortKey] = useState<SortKey>('pts');
  const [minGames, setMinGames] = useState(1);
  const [team, setTeam] = useState('');
  const [query, setQuery] = useState('');

  const source = useMemo(
    () => (stage === 'all' ? seasonMatches : seasonMatches.filter((m) => m.stage === stage)),
    [seasonMatches, stage],
  );

  const teamNames = useMemo(
    () => [...new Set(source.flatMap((m) => [m.home.name, m.away.name]))].sort(),
    [source],
  );

  const rows = useMemo<Row[]>(() => {
    const avg = mode === 'avg';
    return aggregatePlayers(source).map((player) => {
      const div = avg ? player.games || 1 : 1;
      const round = (value: number) => (avg ? Math.round((value / div) * 10) / 10 : value);
      return {
        key: player.key,
        name: player.name,
        team: player.team,
        number: player.number,
        games: player.games,
        min: avg ? Math.round(player.seconds / Math.max(1, player.games)) : player.seconds,
        pts: round(player.pts),
        reb: round(player.reb),
        ast: round(player.ast),
        stl: round(player.stl),
        blk: round(player.blk),
        to: round(player.to),
        eff: round(player.eff),
        fgp: pct(player.fgm, player.fga),
        fg3p: pct(player.fg3m, player.fg3a),
        ftp: pct(player.ftm, player.fta),
      };
    });
  }, [source, mode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((row) => row.games >= minGames)
      .filter((row) => !team || row.team === team)
      .filter((row) => !q || row.name.toLowerCase().includes(q));
  }, [rows, minGames, team, query]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b[sortKey] - a[sortKey] || b.pts - a.pts),
    [filtered, sortKey],
  );

  const top = (key: SortKey) =>
    [...filtered].sort((a, b) => b[key] - a[key] || b.pts - a.pts).slice(0, 5);

  const reset = () => {
    setMinGames(1);
    setTeam('');
    setQuery('');
    setStage('all');
    setSortKey('pts');
  };

  return (
    <section>
      <SectionTitle
        title="Лидеры"
        subtitle={`${division} · сезон ${season} · ${mode === 'avg' ? 'в среднем за игру' : 'суммарно за сезон'}`}
      />

      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={mode}
            onChange={setMode}
            options={[
              { value: 'avg', label: 'За игру' },
              { value: 'total', label: 'Всего' },
            ]}
          />
          <Tabs
            value={stage}
            onChange={setStage}
            options={[
              { value: 'all', label: 'Все стадии' },
              { value: 'regular', label: 'Регулярка' },
              { value: 'playoff', label: 'Плей-офф' },
              { value: 'friendly', label: 'Товарищеские' },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={team}
            onChange={(event) => setTeam(event.target.value)}
            aria-label="Фильтр по команде"
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">Все команды</option>
            {teamNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm">
            <span className="whitespace-nowrap text-muted">Мин. игр</span>
            <input
              type="number"
              min={1}
              max={30}
              value={minGames}
              onChange={(event) => setMinGames(Math.max(1, Number(event.target.value) || 1))}
              className="w-14 bg-transparent text-center font-bold outline-none"
            />
          </label>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск игрока..."
            aria-label="Поиск игрока"
            className={`${inputClass} max-w-xs`}
          />

          <button type="button" onClick={reset} className={btn.subtle}>Сбросить</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          text="Нет игроков по выбранным фильтрам."
          action={<button type="button" onClick={reset} className={btn.primary}>Сбросить фильтры</button>}
        />
      ) : (
        <>
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CARDS.map((card) => (
              <Card key={card.key} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                  <h2 className="text-sm font-black">{card.title}</h2>
                  <button
                    type="button"
                    onClick={() => setSortKey(card.key)}
                    className="text-[11px] font-bold text-accent"
                  >
                    {card.unit}
                  </button>
                </div>
                <ol className="divide-y divide-line">
                  {top(card.key).map((row, index) => (
                    <li key={row.key}>
                      <Link
                        href={`/players/${encodeURIComponent(row.key)}`}
                        className="flex items-center gap-2.5 px-4 py-2 hover:bg-surface2"
                      >
                        <span className="w-4 text-center text-xs font-black text-muted">{index + 1}</span>
                        <TeamBadge team={row.team} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold">{row.name}</span>
                          <span className="block truncate text-[11px] text-muted">{row.team}</span>
                        </span>
                        <span className="font-black tabular-nums text-accent">{row[card.key]}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </Card>
            ))}
          </div>

          <h2 className="mb-3 text-lg font-black">Все игроки · {sorted.length}</h2>
          <Card className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-surface2 text-muted">
                <tr>
                  <th className="px-2 py-2.5 text-left font-bold">#</th>
                  <th className="px-2 py-2.5 text-left font-bold">Игрок</th>
                  <th className="px-2 py-2.5 text-left font-bold">Команда</th>
                  {COLUMNS.map((column) => (
                    <th key={column.key} className="px-2 py-2.5 font-bold">
                      <button
                        type="button"
                        title={`${column.title} — сортировать`}
                        onClick={() => setSortKey(column.key)}
                        className={sortKey === column.key ? 'text-accent' : 'hover:text-fg'}
                      >
                        {column.label}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, index) => (
                  <tr key={row.key} className="border-t border-line text-center hover:bg-surface2">
                    <td className="px-2 py-2.5 text-left text-muted">{index + 1}</td>
                    <td className="px-2 py-2.5 text-left font-semibold">
                      <Link href={`/players/${encodeURIComponent(row.key)}`} className="hover:text-accent">
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-2 py-2.5 text-left">
                      <Link
                        href={`/teams/${encodeURIComponent(row.team)}`}
                        className="inline-flex items-center gap-1.5 text-muted hover:text-accent"
                      >
                        <TeamBadge team={row.team} size="sm" />
                        <span className="hidden sm:inline">{row.team}</span>
                      </Link>
                    </td>
                    <td className="px-2 py-2.5 tabular-nums">{row.games}</td>
                    <td className="px-2 py-2.5 tabular-nums text-muted">{mmss(row.min)}</td>
                    <td className="px-2 py-2.5 font-black tabular-nums text-accent">{row.pts}</td>
                    <td className="px-2 py-2.5 tabular-nums">{row.reb}</td>
                    <td className="px-2 py-2.5 tabular-nums">{row.ast}</td>
                    <td className="px-2 py-2.5 tabular-nums">{row.stl}</td>
                    <td className="px-2 py-2.5 tabular-nums">{row.blk}</td>
                    <td className="px-2 py-2.5 tabular-nums">{row.to}</td>
                    <td className="px-2 py-2.5 font-semibold tabular-nums">{row.eff}</td>
                    <td className="px-2 py-2.5 tabular-nums">{row.fgp}%</td>
                    <td className="px-2 py-2.5 tabular-nums">{row.fg3p}%</td>
                    <td className="px-2 py-2.5 tabular-nums">{row.ftp}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </section>
  );
}
