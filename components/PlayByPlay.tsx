'use client';

import { useMemo, useState } from 'react';
import { teamColor } from '@/lib/format';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Tabs, btn } from '@/components/ui';
import type { LiveEvent, LiveEventKind } from '@/types/match';

const KIND_LABEL: Record<LiveEventKind, string> = {
  score: 'Очки',
  miss: 'Промах',
  foul: 'Фол',
  timeout: 'Тайм-аут',
  sub: 'Замена',
  stat: 'Статистика',
  period: 'Период',
  system: 'Матч',
};

/** Цвет плашки типа события: очки — акцент, фолы — красный, остальное — нейтраль. */
const KIND_CLASS: Record<LiveEventKind, string> = {
  score: 'bg-accent text-accentfg',
  miss: 'bg-surface2 text-muted',
  foul: 'bg-loss text-white',
  timeout: 'bg-surface2 text-fg',
  sub: 'bg-surface2 text-fg',
  stat: 'bg-surface2 text-fg',
  period: 'bg-surface2 text-fg',
  system: 'bg-surface2 text-muted',
};

type Filter = 'all' | 'home' | 'away' | 'score';

export default function PlayByPlay({
  events,
  homeTeam,
  awayTeam,
  title = 'Ход матча',
  onClear,
  emptyText = 'События появятся, как только начнётся матч.',
  maxHeight = 'max-h-[480px]',
}: {
  events: LiveEvent[];
  homeTeam: string;
  awayTeam: string;
  title?: string;
  onClear?: () => void;
  emptyText?: string;
  maxHeight?: string;
}) {
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    if (filter === 'score') return events.filter((event) => event.kind === 'score');
    if (filter === 'all') return events;
    return events.filter((event) => event.side === filter);
  }, [events, filter]);

  return (
    <div className="card flex min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-black">{title}</h2>
        <span className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wide text-muted"
            title={
              isSupabaseConfigured
                ? 'События синхронизируются с Supabase'
                : 'Supabase не настроен — лента пишется в localStorage'
            }
          >
            {isSupabaseConfigured ? 'sync' : 'offline'}
          </span>
          <span className="text-xs font-bold tabular-nums text-muted">{events.length}</span>
        </span>
      </div>

      <div className="border-b border-line px-3 py-2">
        <Tabs
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Все' },
            { value: 'home', label: homeTeam },
            { value: 'away', label: awayTeam },
            { value: 'score', label: 'Очки' },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <p className="px-4 py-10 text-center text-xs text-muted">{emptyText}</p>
      ) : (
        <ul className={`scroll-thin ${maxHeight} flex-1 divide-y divide-line overflow-y-auto`}>
          {visible.map((event) => {
            const system = event.side === 'system';
            return (
              <li
                key={event.id}
                className="feed-in flex items-start gap-2.5 border-l-4 px-3 py-2.5 text-xs"
                style={{ borderLeftColor: system ? 'transparent' : teamColor(event.team) }}
              >
                <span className="w-14 shrink-0 pt-0.5 font-mono text-[11px] text-muted">
                  {event.period > 4 ? `ОТ${event.period - 4}` : `${event.period}Ч`} {event.clock}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${KIND_CLASS[event.kind]}`}
                    >
                      {event.kind === 'score' && event.points
                        ? `+${event.points}`
                        : KIND_LABEL[event.kind]}
                    </span>
                    {!system && (
                      <span className="text-[11px] font-bold" style={{ color: teamColor(event.team) }}>
                        {event.team}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block leading-snug">
                    {event.playerNumber !== undefined && event.playerNumber >= 0 && (
                      <span className="mr-1 font-mono text-muted">#{event.playerNumber}</span>
                    )}
                    {event.text}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {onClear && events.length > 0 && (
        <div className="border-t border-line p-2">
          <button type="button" onClick={onClear} className={`${btn.subtle} w-full`}>
            Очистить ленту
          </button>
        </div>
      )}
    </div>
  );
}
