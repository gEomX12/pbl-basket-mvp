'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLeague } from '@/lib/providers';
import { aggregatePlayers } from '@/lib/league-stats';
import { TEAMS } from '@/lib/league-data';
import { fmtDateShort } from '@/lib/format';
import { TeamBadge } from '@/components/ui';

type Result =
  | { kind: 'team'; label: string; sub: string; href: string }
  | { kind: 'player'; label: string; sub: string; href: string; team: string }
  | { kind: 'match'; label: string; sub: string; href: string };

export default function GlobalSearch({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { allMatches } = useLeague();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const players = useMemo(() => aggregatePlayers(allMatches), [allMatches]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const teams: Result[] = TEAMS.filter((team) => team.name.toLowerCase().includes(q))
      .slice(0, 4)
      .map((team) => ({
        kind: 'team',
        label: team.name,
        sub: team.division,
        href: `/teams/${encodeURIComponent(team.name)}`,
      }));

    const people: Result[] = players
      .filter((player) => player.name.toLowerCase().includes(q))
      .sort((a, b) => b.pts - a.pts)
      .slice(0, 6)
      .map((player) => ({
        kind: 'player',
        label: player.name,
        sub: `${player.team} · ${player.pts} очк. за ${player.games} игр`,
        href: `/players/${encodeURIComponent(player.key)}`,
        team: player.team,
      }));

    const games: Result[] = allMatches
      .filter(
        (match) =>
          match.home.name.toLowerCase().includes(q) || match.away.name.toLowerCase().includes(q),
      )
      .slice(0, 4)
      .map((match) => ({
        kind: 'match',
        label: `${match.home.name} — ${match.away.name}`,
        sub:
          match.status === 'scheduled'
            ? `${fmtDateShort(match.date)} · ${match.time}`
            : `${fmtDateShort(match.date)} · ${match.home.score}:${match.away.score}`,
        href: `/matches/${encodeURIComponent(match.id)}`,
      }));

    return [...teams, ...people, ...games];
  }, [query, players, allMatches]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const active = results.length ? Math.min(cursor, results.length - 1) : 0;

  const go = (result: Result) => {
    setOpen(false);
    setQuery('');
    onNavigate?.();
    router.push(result.href);
  };

  return (
    <div ref={boxRef} className="relative w-full md:w-64">
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setCursor(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (!results.length) return;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setCursor((value) => (value + 1) % results.length);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setCursor((value) => (value - 1 + results.length) % results.length);
          } else if (event.key === 'Enter') {
            event.preventDefault();
            go(results[active]);
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        type="search"
        placeholder="Поиск..."
        aria-label="Поиск по командам, игрокам и матчам"
        className="w-full rounded-lg border border-line bg-surface2 px-3 py-1.5 text-sm outline-none transition focus:border-accent"
      />

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-line bg-surface shadow-xl">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">Ничего не найдено</p>
          ) : (
            results.map((result, index) => (
              <button
                key={`${result.kind}-${result.href}`}
                type="button"
                onMouseEnter={() => setCursor(index)}
                onClick={() => go(result)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition ${
                  index === active ? 'bg-accentsoft' : 'hover:bg-surface2'
                }`}
              >
                <TeamBadge
                  team={result.kind === 'player' ? result.team : result.label}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{result.label}</span>
                  <span className="block truncate text-[11px] text-muted">{result.sub}</span>
                </span>
                <span className="text-[10px] font-bold uppercase text-muted">
                  {result.kind === 'team' ? 'Команда' : result.kind === 'player' ? 'Игрок' : 'Матч'}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
