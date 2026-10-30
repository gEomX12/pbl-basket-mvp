'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLeague } from '@/lib/providers';
import { useClientStore } from '@/lib/client-store';
import { addDaysIso, compareText, fmtDate, todayIso, weekday } from '@/lib/format';
import {
  Card,
  EmptyState,
  SectionTitle,
  StatusBadge,
  Tabs,
  TeamBadge,
  btn,
  inputClass,
} from '@/components/ui';
import type { ArchivedMatch } from '@/types/match';

type Period = 'all' | 'today' | 'tomorrow' | 'upcoming' | 'played';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'today', label: 'Сегодня' },
  { value: 'tomorrow', label: 'Завтра' },
  { value: 'upcoming', label: 'Предстоящие' },
  { value: 'played', label: 'Сыгранные' },
];

function matchRow(match: ArchivedMatch) {
  const played = match.status !== 'scheduled';
  const homeWon = played && match.home.score > match.away.score;
  const awayWon = played && match.away.score > match.home.score;

  return (
    <Link
      key={match.id}
      href={match.status === 'live' ? `/stream/${encodeURIComponent(match.id)}` : `/matches/${encodeURIComponent(match.id)}`}
      className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface2"
    >
      <span className="w-12 shrink-0 text-xs font-bold tabular-nums text-muted">{match.time}</span>

      <span className="hidden min-w-0 flex-1 items-center justify-end gap-2 sm:flex">
        <span className={`truncate text-sm ${homeWon ? 'font-bold' : ''}`}>{match.home.name}</span>
        <TeamBadge team={match.home.name} size="sm" />
      </span>

      <span className="shrink-0 rounded-lg bg-surface2 px-3 py-1 text-sm font-black tabular-nums">
        {played ? `${match.home.score} : ${match.away.score}` : 'vs'}
      </span>

      <span className="hidden min-w-0 flex-1 items-center gap-2 sm:flex">
        <TeamBadge team={match.away.name} size="sm" />
        <span className={`truncate text-sm ${awayWon ? 'font-bold' : ''}`}>{match.away.name}</span>
      </span>

      <span className="min-w-0 flex-1 text-sm sm:hidden">
        <span className={`block truncate ${homeWon ? 'font-bold' : ''}`}>{match.home.name}</span>
        <span className={`block truncate ${awayWon ? 'font-bold' : ''}`}>{match.away.name}</span>
      </span>

      <span className="hidden w-44 shrink-0 truncate text-right text-[11px] text-muted lg:block">
        {match.venue}
      </span>

      <span className="shrink-0">
        <StatusBadge status={match.status} period={match.period} />
      </span>
    </Link>
  );
}

export default function SchedulePage() {
  const { seasonMatches, season, division, stage, setStage } = useLeague();
  const [period, setPeriod] = useState<Period>('all');
  const [team, setTeam] = useState('');
  const [query, setQuery] = useState('');

  // `new Date()` недоступен при пререндере, поэтому сегодняшнюю дату
  // читаем как клиентское значение: на сервере фильтры «Сегодня»/«Завтра» пусты.
  const today = useClientStore('today', todayIso, '');
  const tomorrow = today ? addDaysIso(today, 1) : '';

  const teamNames = useMemo(
    () => [...new Set(seasonMatches.flatMap((m) => [m.home.name, m.away.name]))].sort(),
    [seasonMatches],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return seasonMatches
      .filter((match) => (stage === 'all' ? true : match.stage === stage))
      .filter((match) => !team || match.home.name === team || match.away.name === team)
      .filter((match) => {
        if (period === 'today') return Boolean(today) && match.date === today;
        if (period === 'tomorrow') return Boolean(tomorrow) && match.date === tomorrow;
        if (period === 'upcoming') return match.status === 'scheduled';
        if (period === 'played') return match.status === 'final';
        return true;
      })
      .filter(
        (match) =>
          !q ||
          match.home.name.toLowerCase().includes(q) ||
          match.away.name.toLowerCase().includes(q) ||
          match.venue.toLowerCase().includes(q),
      );
  }, [seasonMatches, stage, team, period, query, today, tomorrow]);

  const grouped = useMemo(() => {
    const map = new Map<string, ArchivedMatch[]>();
    for (const match of filtered) {
      const list = map.get(match.date) ?? [];
      list.push(match);
      map.set(match.date, list);
    }
    return [...map.entries()].map(([date, items]) => ({
      date,
      items: items.sort((a, b) => compareText(a.time, b.time)),
    }));
  }, [filtered]);

  const resetFilters = () => {
    setPeriod('all');
    setTeam('');
    setQuery('');
    setStage('all');
  };

  return (
    <section>
      <SectionTitle
        title="Расписание и результаты"
        subtitle={`${division} · сезон ${season} · найдено матчей: ${filtered.length}`}
        action={
          <Link href="/scorer" className={btn.ghost}>
            Транслировать матч
          </Link>
        }
      />

      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={period} onChange={setPeriod} options={PERIODS} />
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

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Команда или площадка..."
            aria-label="Поиск по расписанию"
            className={`${inputClass} max-w-xs`}
          />

          <button type="button" onClick={resetFilters} className={btn.subtle}>
            Сбросить
          </button>
        </div>
      </div>

      {grouped.length === 0 ? (
        <EmptyState
          text="По выбранным фильтрам матчей нет."
          action={
            <button type="button" onClick={resetFilters} className={btn.primary}>
              Сбросить фильтры
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <Card key={group.date} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line bg-surface2 px-4 py-2.5">
                <h2 className="text-sm font-black">{fmtDate(group.date)}</h2>
                <span className="text-[11px] uppercase tracking-wide text-muted">
                  {weekday(group.date)} · {group.items.length} матч(а)
                </span>
              </div>
              <div className="divide-y divide-line">{group.items.map(matchRow)}</div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
