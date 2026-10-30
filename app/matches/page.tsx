'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLeague } from '@/lib/providers';
import { useClientStore } from '@/lib/client-store';
import { deleteStoredMatch, loadStoredMatches } from '@/lib/storage';
import { fmtDate } from '@/lib/format';
import BoxScoreTable from '@/components/BoxScoreTable';
import { Card, EmptyState, SectionTitle, StatusBadge, TeamBadge, btn, inputClass } from '@/components/ui';
import type { ArchivedMatch } from '@/types/match';

const NO_MATCHES: ArchivedMatch[] = [];

export default function MatchesArchivePage() {
  const { allMatches } = useLeague();
  const stored = useClientStore('matches', loadStoredMatches, NO_MATCHES);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const played = useMemo(
    () => allMatches.filter((match) => match.status !== 'scheduled'),
    [allMatches],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return played.filter(
      (match) =>
        !q ||
        match.home.name.toLowerCase().includes(q) ||
        match.away.name.toLowerCase().includes(q) ||
        match.season.includes(q),
    );
  }, [played, query]);

  const selected = filtered.find((match) => match.id === selectedId) ?? filtered[0] ?? null;

  const ownIds = useMemo(() => new Set(stored.map((match) => match.id)), [stored]);

  return (
    <section>
      <SectionTitle
        title="Архив матчей"
        subtitle={`Все сезоны и дивизионы · протоколов: ${filtered.length}`}
        action={<Link href="/scorer" className={btn.ghost}>Новый протокол</Link>}
      />

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Команда или сезон..."
        aria-label="Поиск по архиву"
        className={`${inputClass} mb-4 max-w-sm`}
      />

      {filtered.length === 0 ? (
        <EmptyState text="Сыгранных матчей не найдено." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          {/* min-w-0: иначе содержимое не даёт колонке сжаться на узком экране */}
          <div className="scroll-thin max-h-[70vh] min-w-0 space-y-2 overflow-y-auto pr-1">
            {filtered.map((match) => {
              const active = selected?.id === match.id;
              return (
                <div
                  key={match.id}
                  className={`card px-4 py-3 transition ${active ? 'border-accent' : 'hover:border-accent'}`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(match.id)}
                    className="w-full text-left"
                  >
                    <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted">
                      <span>{fmtDate(match.date)}</span>
                      <StatusBadge status={match.status} period={match.period} />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <TeamBadge team={match.home.name} size="sm" />
                        <span className="truncate">{match.home.name}</span>
                      </span>
                      <span className="font-black tabular-nums">{match.home.score}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-sm font-semibold">
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <TeamBadge team={match.away.name} size="sm" />
                        <span className="truncate">{match.away.name}</span>
                      </span>
                      <span className="font-black tabular-nums">{match.away.score}</span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted">
                      {match.season} · {match.division} · {match.venue}
                    </p>
                  </button>

                  {ownIds.has(match.id) && (
                    <button
                      type="button"
                      onClick={() => deleteStoredMatch(match.id)}
                      className="mt-2 text-[11px] font-bold text-loss hover:underline"
                    >
                      Удалить мой протокол
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="min-w-0">
            {selected ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-black">
                    {selected.home.name} {selected.home.score} — {selected.away.score} {selected.away.name}
                  </h2>
                  <Link href={`/matches/${encodeURIComponent(selected.id)}`} className={btn.subtle}>
                    Страница матча →
                  </Link>
                </div>
                <BoxScoreTable home={selected.home} away={selected.away} />
              </div>
            ) : (
              <Card className="p-8 text-center text-sm text-muted">
                Выберите матч, чтобы открыть протокол.
              </Card>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
