'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLeague } from '@/lib/providers';
import { appendEvent, clearEvents, useLiveFeed } from '@/lib/live-feed';
import { fmtDate } from '@/lib/format';
import BoxScoreTable from '@/components/BoxScoreTable';
import { Card, EmptyState, StatusBadge, TeamBadge, btn } from '@/components/ui';
import PlayByPlay from '@/components/PlayByPlay';
import type { ArchivedMatch } from '@/types/match';

const PERIOD_SECONDS = 600;

function clockToSeconds(clock: string | undefined): number {
  if (!clock) return PERIOD_SECONDS;
  const [m, s] = clock.split(':').map(Number);
  return (m || 0) * 60 + (s || 0);
}

function secondsToClock(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Табло трансляции. Вынесено в отдельный компонент и монтируется с `key={match.id}`,
 * чтобы начальное состояние бралось из матча без синхронизации через эффект.
 */
function Broadcast({ match }: { match: ArchivedMatch }) {
  const initialPeriod = match.period ?? (match.status === 'final' ? 4 : 1);
  const initialSeconds = match.status === 'live' ? clockToSeconds(match.clock) : PERIOD_SECONDS;

  const [running, setRunning] = useState(match.status === 'live');
  const [seconds, setSeconds] = useState(initialSeconds);
  const [period, setPeriod] = useState(initialPeriod);
  const [score, setScore] = useState({ home: match.home.score, away: match.away.score });
  const [showBox, setShowBox] = useState(true);
  const [swapped, setSwapped] = useState(false);

  const events = useLiveFeed(match.id);

  /** Случайное демо-событие: счёт + запись в живой протокол. */
  const emitDemoEvent = useCallback(
    (atPeriod: number, atSeconds: number) => {
      const isHome = Math.random() < 0.5;
      const side = isHome ? match.home : match.away;
      const points = Math.random() < 0.18 ? 3 : Math.random() < 0.25 ? 1 : 2;
      const player = side.players[Math.floor(Math.random() * Math.max(1, side.players.length))];

      setScore((current) => ({
        home: current.home + (isHome ? points : 0),
        away: current.away + (isHome ? 0 : points),
      }));

      appendEvent({
        matchId: match.id,
        period: atPeriod,
        clock: secondsToClock(atSeconds),
        side: isHome ? 'home' : 'away',
        team: side.name,
        kind: 'score',
        points,
        playerName: player?.name,
        playerNumber: player?.number,
        text: player ? `${player.name} набирает ${points}` : `${side.name}: +${points}`,
      });
    },
    [match],
  );

  // setTimeout + зависимость от seconds/period: внутри апдейтеров состояния
  // нет побочных эффектов, поэтому StrictMode не задваивает события ленты.
  useEffect(() => {
    if (!running) return undefined;

    const timer = window.setTimeout(() => {
      if (seconds <= 1) {
        if (period >= 4) {
          setSeconds(0);
          setRunning(false);
          return;
        }
        const next = period + 1;
        setPeriod(next);
        setSeconds(PERIOD_SECONDS);
        appendEvent({
          matchId: match.id,
          period: next,
          clock: secondsToClock(PERIOD_SECONDS),
          side: 'system',
          team: '',
          kind: 'period',
          text: `Начало ${next}-й четверти`,
        });
        return;
      }

      setSeconds(seconds - 1);
      // Демонстрационные события — примерно раз в десяток секунд.
      if (Math.random() < 0.08) emitDemoEvent(period, seconds);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [running, seconds, period, match.id, emitDemoEvent]);

  const sides = swapped
    ? { left: match.away, right: match.home, leftScore: score.away, rightScore: score.home }
    : { left: match.home, right: match.away, leftScore: score.home, rightScore: score.away };

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href={`/matches/${encodeURIComponent(match.id)}`} className="text-sm text-muted hover:text-accent">
          ← Страница матча
        </Link>
        <StatusBadge status={match.status} period={period} />
      </div>

      <Card className="overflow-hidden">
        <div className="bg-surface2 px-5 py-2.5 text-center text-xs text-muted">
          {fmtDate(match.date)} · {match.venue} · {match.division}, сезон {match.season}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-8 sm:gap-8 sm:px-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <TeamBadge team={sides.left.name} size="xl" />
            <span className="text-sm font-black sm:text-xl">{sides.left.name}</span>
            <span className="text-[11px] text-muted">
              Фолы: {sides.left.fouls} · Тайм-ауты: {sides.left.timeouts}
            </span>
          </div>

          <div className="text-center">
            <div className="text-5xl font-black tabular-nums sm:text-7xl">
              {sides.leftScore}
              <span className="mx-2 text-muted">:</span>
              {sides.rightScore}
            </div>
            <div className="mt-2 inline-flex items-center gap-3 rounded-xl bg-surface2 px-4 py-2">
              <span className="text-xs font-black uppercase text-muted">{period}-я четв.</span>
              <span className="font-mono text-2xl font-black tabular-nums text-accent">
                {secondsToClock(seconds)}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <TeamBadge team={sides.right.name} size="xl" />
            <span className="text-sm font-black sm:text-xl">{sides.right.name}</span>
            <span className="text-[11px] text-muted">
              Фолы: {sides.right.fouls} · Тайм-ауты: {sides.right.timeouts}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 border-t border-line px-5 py-4">
          <button type="button" onClick={() => setRunning((value) => !value)} className={btn.primary}>
            {running ? 'Пауза' : 'Запустить трансляцию'}
          </button>
          <button
            type="button"
            onClick={() => {
              setRunning(false);
              setPeriod(initialPeriod);
              setSeconds(initialSeconds);
              setScore({ home: match.home.score, away: match.away.score });
              clearEvents(match.id);
            }}
            className={btn.ghost}
          >
            Сбросить
          </button>
          <button type="button" onClick={() => setSwapped((value) => !value)} className={btn.ghost}>
            Поменять стороны
          </button>
          <button type="button" onClick={() => setShowBox((value) => !value)} className={btn.ghost}>
            {showBox ? 'Скрыть протокол' : 'Показать протокол'}
          </button>
          <Link href="/scorer" className={btn.ghost}>Судейский столик</Link>
        </div>
      </Card>

      <p className="mt-2 text-center text-[11px] text-muted">
        Демонстрационная трансляция: таймер и события генерируются в браузере.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* min-w-0: иначе содержимое не даёт колонке сжаться на узком экране */}
        <div className="min-w-0">{showBox && <BoxScoreTable home={match.home} away={match.away} />}</div>

        <PlayByPlay
          events={events}
          homeTeam={match.home.name}
          awayTeam={match.away.name}
          emptyText="Запустите трансляцию, чтобы увидеть события."
          onClear={() => clearEvents(match.id)}
        />
      </div>
    </section>
  );
}

export default function StreamView({ matchId }: { matchId: string }) {
  const id = matchId;
  const { allMatches } = useLeague();
  const match = useMemo(() => allMatches.find((item) => item.id === id), [allMatches, id]);

  if (!match) {
    return (
      <section>
        <Link href="/schedule" className="text-sm text-muted hover:text-accent">← Расписание</Link>
        <EmptyState text="Матч не найден." />
      </section>
    );
  }

  return <Broadcast key={match.id} match={match} />;
}
