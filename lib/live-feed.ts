'use client';

import { useEffect } from 'react';
import { notify, useClientStore } from '@/lib/client-store';
import { compareText } from '@/lib/format';
import { TABLES, getSupabase } from '@/lib/supabase';
import type { LiveEvent, LiveEventKind } from '@/types/match';

/**
 * Лента событий матча.
 *
 * Источник истины — localStorage: запись синхронная, UI обновляется мгновенно
 * и работает без сети. Supabase подключается поверх: отправка идёт «в фоне»
 * (ошибки гасятся), входящие realtime-события сливаются в тот же локальный
 * кэш, поэтому рендер у обоих путей общий.
 *
 * SQL для таблицы — см. `supabase/schema.sql`.
 */

const NO_EVENTS: LiveEvent[] = [];
const MAX_EVENTS = 300;

const storageKey = (matchId: string) => `pbl.live.${matchId}`;
const cacheKey = (matchId: string) => `live:${matchId}`;

export function loadEvents(matchId: string): LiveEvent[] {
  if (typeof window === 'undefined') return NO_EVENTS;
  try {
    const raw = window.localStorage.getItem(storageKey(matchId));
    return raw ? (JSON.parse(raw) as LiveEvent[]) : NO_EVENTS;
  } catch {
    return NO_EVENTS;
  }
}

function writeEvents(matchId: string, events: LiveEvent[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(matchId), JSON.stringify(events.slice(0, MAX_EVENTS)));
  } catch {
    /* переполненное хранилище игнорируем */
  }
  notify();
}

/** Новые события идут первыми; порядок — по таймкоду записи. */
function sortDesc(events: LiveEvent[]): LiveEvent[] {
  return [...events].sort((a, b) => compareText(b.createdAt, a.createdAt));
}

export type NewLiveEvent = Omit<LiveEvent, 'id' | 'createdAt'>;

/** Добавляет событие локально и, если возможно, отправляет в Supabase. */
export function appendEvent(input: NewLiveEvent): LiveEvent {
  const event: LiveEvent = {
    ...input,
    id: `${input.matchId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };

  writeEvents(event.matchId, [event, ...loadEvents(event.matchId)]);
  pushRemote(event);
  return event;
}

/** Сливает событие из realtime-канала, не создавая дублей. */
export function mergeEvent(event: LiveEvent): void {
  const current = loadEvents(event.matchId);
  if (current.some((item) => item.id === event.id)) return;
  writeEvents(event.matchId, sortDesc([event, ...current]));
}

/** Откатывает ленту до указанной длины — используется кнопкой «Отменить». */
export function truncateEvents(matchId: string, length: number): void {
  const current = loadEvents(matchId);
  if (current.length <= length) return;
  writeEvents(matchId, current.slice(current.length - length));
}

export function clearEvents(matchId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(matchId));
  } catch {
    /* ignore */
  }
  notify();
}

/* ------------------------------------------------------------------ */
/*  Supabase (необязательный слой)                                      */
/* ------------------------------------------------------------------ */

type Row = {
  id: string;
  match_id: string;
  created_at: string;
  period: number;
  clock: string;
  side: LiveEvent['side'];
  team: string;
  kind: LiveEventKind;
  points: number | null;
  player_name: string | null;
  player_number: number | null;
  text: string;
};

const toRow = (event: LiveEvent): Row => ({
  id: event.id,
  match_id: event.matchId,
  created_at: event.createdAt,
  period: event.period,
  clock: event.clock,
  side: event.side,
  team: event.team,
  kind: event.kind,
  points: event.points ?? null,
  player_name: event.playerName ?? null,
  player_number: event.playerNumber ?? null,
  text: event.text,
});

const fromRow = (row: Row): LiveEvent => ({
  id: row.id,
  matchId: row.match_id,
  createdAt: row.created_at,
  period: row.period,
  clock: row.clock,
  side: row.side,
  team: row.team,
  kind: row.kind,
  points: row.points ?? undefined,
  playerName: row.player_name ?? undefined,
  playerNumber: row.player_number ?? undefined,
  text: row.text,
});

/** Отправка «в фоне»: сеть никогда не блокирует и не ломает интерфейс. */
function pushRemote(event: LiveEvent): void {
  const supabase = getSupabase();
  if (!supabase) return;
  void supabase
    .from(TABLES.liveEvents)
    .insert(toRow(event))
    .then(({ error }) => {
      if (error) console.warn('[live-feed] не удалось отправить событие:', error.message);
    });
}

/** Подтягивает историю и подписывается на новые события. Возвращает отписку. */
function subscribeRemote(matchId: string): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  let active = true;

  void supabase
    .from(TABLES.liveEvents)
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: false })
    .limit(MAX_EVENTS)
    .then(({ data, error }) => {
      if (!active || error || !data) return;
      for (const row of data as Row[]) mergeEvent(fromRow(row));
    });

  const channel = supabase
    .channel(`live-events:${matchId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: TABLES.liveEvents,
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => {
        if (active) mergeEvent(fromRow(payload.new as Row));
      },
    )
    .subscribe();

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}

/* ------------------------------------------------------------------ */
/*  Хук                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Лента матча. Читает localStorage через внешнее хранилище (без setState
 * в эффекте) и, если Supabase настроен, держит realtime-подписку.
 */
export function useLiveFeed(matchId: string | null): LiveEvent[] {
  const events = useClientStore(
    matchId ? cacheKey(matchId) : 'live:none',
    () => (matchId ? loadEvents(matchId) : NO_EVENTS),
    NO_EVENTS,
  );

  useEffect(() => {
    if (!matchId) return undefined;
    return subscribeRemote(matchId);
  }, [matchId]);

  return events;
}
