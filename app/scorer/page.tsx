'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLeague } from '@/lib/providers';
import { useClientStore, useHydrated } from '@/lib/client-store';
import {
  clearMatchSession,
  loadMatchSession,
  saveMatchSession,
  type MatchSession,
} from '@/lib/match-session';
import { appendEvent, clearEvents, truncateEvents, useLiveFeed } from '@/lib/live-feed';
import { STAGES, TEAMS, createPlayer, rosterOf } from '@/lib/league-data';
import {
  applyBoxStat,
  applyFoulToPlayer,
  applyMadeShot,
  applyMissedShot,
} from '@/lib/stats';
import { rebTotal } from '@/lib/league-stats';
import { jersey, mmss, todayIso } from '@/lib/format';
import { saveMatch } from '@/lib/storage';
import { useJudge } from '@/lib/judge-auth';
import {
  Card,
  RouteFallback,
  SectionTitle,
  TeamBadge,
  btn,
  inputClass,
  labelClass,
} from '@/components/ui';
import PlayByPlay from '@/components/PlayByPlay';
import type {
  ArchivedMatch,
  BoxStatAction,
  LiveEvent,
  LiveEventKind,
  MatchStage,
  Player,
  ScoringPoints,
  TeamState,
} from '@/types/match';

type Side = 'home' | 'away';

const PERIOD_SECONDS = 600;
const MAX_ON_COURT = 5;

const BOX_ACTIONS: { action: BoxStatAction; label: string; title: string }[] = [
  { action: 'ast', label: 'Передача', title: 'Результативная передача' },
  { action: 'stl', label: 'Перехват', title: 'Перехват' },
  { action: 'reb_off', label: 'Подб. атк', title: 'Подбор в нападении' },
  { action: 'reb_def', label: 'Подб. защ', title: 'Подбор в защите' },
  { action: 'blk', label: 'Блок', title: 'Блок-шот' },
  { action: 'to', label: 'Потеря', title: 'Потеря' },
];

const NO_SELECTION: Record<'home' | 'away', string | null> = { home: null, away: null };

/** Общая основа крупных кнопок действий. */
const ACT =
  'inline-flex h-11 items-center justify-center rounded-lg text-sm font-black transition active:scale-95 disabled:pointer-events-none disabled:opacity-35';

function buildTeam(name: string): TeamState {
  return {
    name,
    score: 0,
    fouls: 0,
    timeouts: 0,
    quarters: [0, 0, 0, 0],
    players: rosterOf(name)
      .slice(0, 10)
      .map((entry, index) => createPlayer(`${name}-${index}`, entry.number, entry.name)),
  };
}

const RESTORED_NOTICE =
  'Матч восстановлен после перезагрузки. Часы на паузе — нажмите «Старт», когда продолжите.';

/**
 * Столик. Монтируется с `key`, завязанным на завершение гидратации, поэтому
 * все начальные значения берутся из черновика прямо в инициализаторах
 * `useState` — без синхронизации через эффект.
 */
function ScorerDesk({
  initial,
  canPersist,
}: {
  initial: MatchSession | null;
  canPersist: boolean;
}) {
  const router = useRouter();
  const { season, division } = useLeague();

  const restored = initial?.desk ?? null;

  const [started, setStarted] = useState(() => Boolean(restored));
  const [homeName, setHomeName] = useState(() => initial?.setup.homeName ?? TEAMS[0].name);
  const [awayName, setAwayName] = useState(() => initial?.setup.awayName ?? TEAMS[1].name);
  const [venue, setVenue] = useState(() => initial?.setup.venue ?? TEAMS[0].arena);
  const [stage, setStage] = useState<MatchStage>(() => initial?.setup.stage ?? 'regular');
  // Сегодняшняя дата доступна только в браузере: при пререндере `new Date()` запрещён.
  const today = useClientStore('today', todayIso, '');
  const [dateDraft, setDateDraft] = useState<string | null>(() => initial?.setup.date || null);
  const date = dateDraft ?? today;
  const [time, setTime] = useState(() => initial?.setup.time ?? '19:00');

  const [home, setHome] = useState<TeamState>(() => restored?.home ?? buildTeam(TEAMS[0].name));
  const [away, setAway] = useState<TeamState>(() => restored?.away ?? buildTeam(TEAMS[1].name));
  const [onCourt, setOnCourt] = useState<Record<Side, string[]>>(
    () => restored?.onCourt ?? { home: [], away: [] },
  );

  const [quarter, setQuarter] = useState(() => restored?.quarter ?? 1);
  const [timeLeft, setTimeLeft] = useState(() => restored?.timeLeft ?? PERIOD_SECONDS);
  // После перезагрузки часы всегда стоят: когда продолжать — решает судья.
  const [running, setRunning] = useState(false);
  const [possession, setPossession] = useState<Side | null>(() => restored?.possession ?? null);
  const [selected, setSelected] = useState<Record<Side, string | null>>(
    () => restored?.selected ?? NO_SELECTION,
  );
  // Пока пятёрка не выбрана — сразу показываем весь состав.
  const [editing, setEditing] = useState<Record<Side, boolean>>(() => ({
    home: !restored?.onCourt.home.length,
    away: !restored?.onCourt.away.length,
  }));
  const [history, setHistory] = useState<string[]>(() => restored?.history ?? []);
  const [notice, setNotice] = useState<string | null>(() => (restored ? RESTORED_NOTICE : null));

  // Идентификатор сессии = будущий id матча: лента событий сразу привязана
  // к записи, которая появится в архиве после финальной сирены.
  const [sessionId, setSessionId] = useState<string | null>(() => restored?.sessionId ?? null);
  const events = useLiveFeed(sessionId);

  /* ----------------------------- Таймер ----------------------------- */

  const tickMinutes = (team: TeamState, ids: string[]): TeamState => {
    if (ids.length === 0) return team;
    return {
      ...team,
      players: team.players.map((player) =>
        ids.includes(player.id) ? { ...player, seconds: player.seconds + 1 } : player,
      ),
    };
  };

  // setTimeout + зависимость от timeLeft: апдейтеры остаются чистыми,
  // а на нуле эффект просто не перезапускается и часы останавливаются.
  useEffect(() => {
    if (!running || timeLeft <= 0) return undefined;

    const timer = window.setTimeout(() => {
      const next = timeLeft - 1;
      setTimeLeft(next);
      if (next === 0) setRunning(false);
      // Набираем игровое время тем, кто на площадке.
      setHome((prev) => tickMinutes(prev, onCourt.home));
      setAway((prev) => tickMinutes(prev, onCourt.away));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [running, timeLeft, onCourt]);

  /* ------------------------ Автосохранение -------------------------- */

  // Пишем черновик на каждое изменение. До конца гидратации сохранять нельзя:
  // в этот момент состояние ещё начальное и затёрло бы восстановленный матч.
  useEffect(() => {
    if (!canPersist) return;
    saveMatchSession({
      setup: { homeName, awayName, venue, stage, date, time },
      desk:
        started && sessionId
          ? {
              sessionId, home, away, onCourt, quarter, timeLeft, possession,
              selectedId: selected.home ?? selected.away, selected, history,
            }
          : null,
    });
  }, [
    canPersist, started, sessionId, homeName, awayName, venue, stage, date, time,
    home, away, onCourt, quarter, timeLeft, possession, selected, history,
  ]);

  /* --------------------------- Утилиты ------------------------------ */

  const snapshot = useCallback(() => {
    setHistory((prev) => [
      ...prev.slice(-40),
      JSON.stringify({ home, away, quarter, onCourt, possession, eventCount: events.length }),
    ]);
  }, [home, away, quarter, onCourt, possession, events.length]);

  /** Запись в живой протокол: localStorage сразу, Supabase — фоном. */
  const logEvent = useCallback(
    (
      side: LiveEvent['side'],
      kind: LiveEventKind,
      text: string,
      extra: { points?: number; player?: Player } = {},
    ) => {
      if (!sessionId) return;
      appendEvent({
        matchId: sessionId,
        period: quarter,
        clock: mmss(timeLeft),
        side,
        team: side === 'home' ? home.name : side === 'away' ? away.name : '',
        kind,
        points: extra.points,
        playerName: extra.player?.name,
        playerNumber: extra.player?.number,
        text,
      });
    },
    [sessionId, quarter, timeLeft, home.name, away.name],
  );

  const selectedPlayer = (side: Side): Player | null => {
    const team = side === 'home' ? home : away;
    return team.players.find((player) => player.id === selected[side]) ?? null;
  };

  const patch = (side: Side, updater: (prev: TeamState) => TeamState) => {
    if (side === 'home') setHome(updater);
    else setAway(updater);
  };

  const requireSelection = (side: Side): { player: Player; side: Side } | null => {
    const player = selectedPlayer(side);
    if (!player) {
      setNotice('Сначала выберите игрока на площадке.');
      return null;
    }
    setNotice(null);
    return { player, side };
  };

  /* --------------------------- Действия ----------------------------- */

  const score = (side: Side, points: ScoringPoints) => {
    const target = requireSelection(side);
    if (!target) return;
    snapshot();
    patch(target.side, (prev) => {
      const quarters = [...prev.quarters];
      while (quarters.length < quarter) quarters.push(0);
      quarters[quarter - 1] += points;
      return {
        ...prev,
        score: prev.score + points,
        quarters,
        players: prev.players.map((item) =>
          item.id === target.player.id ? applyMadeShot(item, points) : item,
        ),
      };
    });
    setPossession(target.side === 'home' ? 'away' : 'home');
    const shot = points === 1 ? 'штрафной' : points === 3 ? 'трёхочковый' : 'двухочковый';
    logEvent(target.side, 'score', `${target.player.name} реализует ${shot}`, {
      points,
      player: target.player,
    });
  };

  const miss = (side: Side, points: ScoringPoints) => {
    const target = requireSelection(side);
    if (!target) return;
    snapshot();
    patch(target.side, (prev) => ({
      ...prev,
      players: prev.players.map((item) =>
        item.id === target.player.id ? applyMissedShot(item, points) : item,
      ),
    }));
    logEvent(target.side, 'miss', `${target.player.name} — промах (${points} очк.)`, {
      player: target.player,
    });
  };

  const foul = (side: Side) => {
    const target = requireSelection(side);
    if (!target) return;
    if (target.player.fouls >= 5) {
      setNotice(`${target.player.name} уже набрал 5 фолов — замена обязательна.`);
      return;
    }
    snapshot();
    patch(target.side, (prev) => ({
      ...prev,
      fouls: prev.fouls + 1,
      players: prev.players.map((item) =>
        item.id === target.player.id ? applyFoulToPlayer(item) ?? item : item,
      ),
    }));
    logEvent(
      target.side,
      'foul',
      `${target.player.name} — ${target.player.fouls + 1}-й персональный фол`,
      { player: target.player },
    );
  };

  const boxStat = (side: Side, action: BoxStatAction) => {
    const target = requireSelection(side);
    if (!target) return;
    snapshot();
    patch(target.side, (prev) => ({
      ...prev,
      players: prev.players.map((item) =>
        item.id === target.player.id ? applyBoxStat(item, action) : item,
      ),
    }));
    const label = BOX_ACTIONS.find((item) => item.action === action)?.label ?? action;
    logEvent(target.side, 'stat', `${target.player.name} — ${label}`, { player: target.player });
  };

  const timeout = (side: Side) => {
    snapshot();
    patch(side, (prev) => ({ ...prev, timeouts: prev.timeouts + 1 }));
    setRunning(false);
    logEvent(side, 'timeout', 'Запрошен тайм-аут');
  };

  const toggleOnCourt = (side: Side, id: string) => {
    const current = onCourt[side];
    if (current.includes(id)) {
      setOnCourt({ ...onCourt, [side]: current.filter((item) => item !== id) });
      if (selected[side] === id) setSelected({ ...selected, [side]: null });
      return;
    }
    if (current.length >= MAX_ON_COURT) {
      setNotice(`На площадке уже ${MAX_ON_COURT} игроков — сначала уберите кого-то.`);
      return;
    }
    setNotice(null);
    const next = [...current, id];
    setOnCourt({ ...onCourt, [side]: next });
    // Пятёрка собрана — возвращаемся к игре.
    if (next.length === MAX_ON_COURT) setEditing((prev) => ({ ...prev, [side]: false }));
  };

  const undo = () => {
    const prev = [...history];
    const last = prev.pop();
    if (!last) return;
    const state = JSON.parse(last) as {
      home: TeamState;
      away: TeamState;
      quarter: number;
      onCourt: Record<Side, string[]>;
      possession: Side | null;
      eventCount: number;
    };
    setHome(state.home);
    setAway(state.away);
    setQuarter(state.quarter);
    setOnCourt(state.onCourt);
    setPossession(state.possession);
    if (sessionId) truncateEvents(sessionId, state.eventCount);
    setHistory(prev);
  };

  const nextQuarter = () => {
    snapshot();
    setQuarter((prev) => prev + 1);
    setHome((prev) => ({ ...prev, fouls: 0, quarters: [...prev.quarters, 0] }));
    setAway((prev) => ({ ...prev, fouls: 0, quarters: [...prev.quarters, 0] }));
    setTimeLeft(PERIOD_SECONDS);
    setRunning(false);
    logEvent('system', 'period', 'Новая четверть — командные фолы сброшены');
  };

  const finish = () => {
    const match: ArchivedMatch = {
      id: sessionId ?? `live-${Date.now()}`,
      date,
      time,
      venue: venue.trim() || 'Судейский столик',
      status: 'final',
      stage,
      season,
      division,
      home: { ...home, quarters: home.quarters.slice(0, Math.max(4, quarter)) },
      away: { ...away, quarters: away.quarters.slice(0, Math.max(4, quarter)) },
    };
    saveMatch(match);
    clearMatchSession();
    router.push(`/matches/${encodeURIComponent(match.id)}`);
  };

  /** «Новый матч»: сбрасываем счёт, таймер и черновик, настройки оставляем. */
  const resetMatch = () => {
    clearMatchSession();
    setStarted(false);
    setSessionId(null);
    setHome(buildTeam(homeName));
    setAway(buildTeam(awayName));
    setOnCourt({ home: [], away: [] });
    setEditing({ home: true, away: true });
    setHistory([]);
    setQuarter(1);
    setTimeLeft(PERIOD_SECONDS);
    setRunning(false);
    setPossession(null);
    setSelected(NO_SELECTION);
    setNotice(null);
  };

  /* -------------------------- Настройка ----------------------------- */

  if (!started) {
    const sameTeams = homeName === awayName;
    return (
      <section className="mx-auto max-w-2xl">
        <SectionTitle
          title="Судейский столик"
          subtitle={`Новый протокол · ${division}, сезон ${season}`}
        />
        <Card className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className={labelClass}>Хозяева</span>
              <select
                value={homeName}
                onChange={(event) => {
                  setHomeName(event.target.value);
                  setVenue(TEAMS.find((t) => t.name === event.target.value)?.arena ?? venue);
                }}
                className={inputClass}
              >
                {TEAMS.map((team) => (
                  <option key={team.name} value={team.name}>{team.name}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className={labelClass}>Гости</span>
              <select
                value={awayName}
                onChange={(event) => setAwayName(event.target.value)}
                className={inputClass}
              >
                {TEAMS.map((team) => (
                  <option key={team.name} value={team.name}>{team.name}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className={labelClass}>Дата</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDateDraft(event.target.value)}
                className={inputClass}
              />
            </label>

            <label className="block space-y-1.5">
              <span className={labelClass}>Время</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
            </label>

            <label className="block space-y-1.5">
              <span className={labelClass}>Площадка</span>
              <input value={venue} onChange={(e) => setVenue(e.target.value)} className={inputClass} />
            </label>

            <label className="block space-y-1.5">
              <span className={labelClass}>Стадия</span>
              <select
                value={stage}
                onChange={(event) => setStage(event.target.value as MatchStage)}
                className={inputClass}
              >
                {STAGES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
          </div>

          {sameTeams && (
            <p className="rounded-lg bg-loss/10 px-3 py-2 text-xs font-bold text-loss">
              Выберите разные команды.
            </p>
          )}

          <button
            type="button"
            disabled={sameTeams}
            onClick={() => {
              const id = `live-${Date.now()}`;
              clearEvents(id);
              setSessionId(id);
              setHome(buildTeam(homeName));
              setAway(buildTeam(awayName));
              setOnCourt({ home: [], away: [] });
              setEditing({ home: true, away: true });
              setHistory([]);
              setQuarter(1);
              setTimeLeft(PERIOD_SECONDS);
              setSelected(NO_SELECTION);
              setStarted(true);
              appendEvent({
                matchId: id,
                period: 1,
                clock: mmss(PERIOD_SECONDS),
                side: 'system',
                team: '',
                kind: 'system',
                text: `${homeName} — ${awayName}: стартовое вбрасывание`,
              });
            }}
            className={`${btn.primary} w-full`}
          >
            Начать матч
          </button>

          <p className="text-[11px] text-muted">
            Составы подставляются из ростеров команд. Протокол сохраняется в этом браузере и
            попадает в архив матчей и статистику лиги.
          </p>
        </Card>
      </section>
    );
  }

  /* ---------------------------- Столик ------------------------------ */

  const periodLabel = quarter > 4 ? `ОТ${quarter - 4}` : `${quarter}-я четверть`;

  /** Колонка кнопок действий: своя у каждой команды. */
  const renderActions = (side: Side) => {
    const player = selectedPlayer(side);
    const off = !player;
    return (
      <div className="flex w-full flex-col gap-2 sm:w-44 sm:shrink-0">
        <div className="truncate rounded-lg bg-surface2 px-3 py-2 text-xs font-bold">
          {player ? (
            <>
              {player.number >= 0 && (
                <span className="mr-1 font-mono text-accent">#{player.number}</span>
              )}
              {player.name}
            </>
          ) : (
            <span className="text-muted">Выберите игрока</span>
          )}
        </div>

        <div>
          <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-muted">Попадание</p>
          <div className="grid grid-cols-3 gap-1.5">
            {([1, 2, 3] as ScoringPoints[]).map((points) => (
              <button
                key={points}
                type="button"
                disabled={off}
                onClick={() => score(side, points)}
                className={`${ACT} bg-win text-base text-white hover:brightness-110`}
              >
                +{points}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-muted">Промах</p>
          <div className="grid grid-cols-3 gap-1.5">
            {([1, 2, 3] as ScoringPoints[]).map((points) => (
              <button
                key={points}
                type="button"
                disabled={off}
                title={`Промах ${points}-очкового`}
                onClick={() => miss(side, points)}
                className={`${ACT} border border-line bg-surface text-muted hover:border-loss hover:text-loss`}
              >
                {points}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {BOX_ACTIONS.map((item) => (
            <button
              key={item.action}
              type="button"
              disabled={off}
              title={item.title}
              onClick={() => boxStat(side, item.action)}
              className={`${ACT} h-10 bg-surface2 text-xs hover:bg-accentsoft hover:text-accent`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={off}
          onClick={() => foul(side)}
          className={`${ACT} bg-loss text-white hover:brightness-110`}
        >
          Фол
        </button>
      </div>
    );
  };

  /** Выбор пятёрки и замены: весь состав плиткой. */
  const renderRoster = (side: Side) => {
    const team = side === 'home' ? home : away;
    const ids = onCourt[side];
    return (
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-muted">
            На площадке{' '}
            <span className={ids.length === MAX_ON_COURT ? 'text-win' : 'text-accent'}>
              {ids.length}/{MAX_ON_COURT}
            </span>
          </p>
          {ids.length > 0 && (
            <button
              type="button"
              onClick={() => setEditing((prev) => ({ ...prev, [side]: false }))}
              className={btn.subtle}
            >
              Готово
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {team.players.map((player) => {
            const playing = ids.includes(player.id);
            const fouledOut = player.fouls >= 5;
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => toggleOnCourt(side, player.id)}
                className={`flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition ${
                  playing
                    ? 'border-win bg-win/15 font-bold'
                    : 'border-line bg-surface hover:border-accent/60'
                } ${fouledOut ? 'opacity-50' : ''}`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-black ${
                    playing ? 'bg-win text-white' : 'bg-surface2 text-muted'
                  }`}
                >
                  {jersey(player.number)}
                </span>
                <span className="truncate">{player.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  /** Пятёрка на площадке: крупные строки, по нажатию игрок становится активным. */
  const renderCourt = (side: Side) => {
    const team = side === 'home' ? home : away;
    const players = onCourt[side]
      .map((id) => team.players.find((player) => player.id === id))
      .filter((player): player is Player => Boolean(player));

    return (
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {players.map((player) => {
          const active = selected[side] === player.id;
          return (
            <button
              key={player.id}
              type="button"
              onClick={() => {
                setSelected({ ...selected, [side]: player.id });
                setNotice(null);
              }}
              className={`flex min-h-[52px] items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                active
                  ? 'border-accent bg-accentsoft ring-1 ring-accent'
                  : 'border-line bg-surface hover:border-accent/50'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-sm font-black ${
                  active ? 'bg-accent text-accentfg' : 'bg-surface2'
                }`}
              >
                {jersey(player.number)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{player.name}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
                  <span className="flex gap-0.5" title={`Фолы: ${player.fouls}`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={`h-1.5 w-1.5 rounded-full ${
                          player.fouls >= n ? (player.fouls >= 5 ? 'bg-loss' : 'bg-accent') : 'bg-line'
                        }`}
                      />
                    ))}
                  </span>
                  <span className="tabular-nums">{mmss(player.seconds)}</span>
                  <span className="hidden tabular-nums md:inline">
                    · {player.ast} пер · {rebTotal(player)} подб
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-mono text-lg font-black leading-none tabular-nums">
                  {player.points}
                </span>
                <span className="text-[10px] text-muted">очк</span>
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setEditing((prev) => ({ ...prev, [side]: true }))}
          className="mt-auto rounded-xl border border-dashed border-line px-3 py-2 text-xs font-bold text-muted transition hover:border-accent hover:text-accent"
        >
          {players.length === 0 ? 'Выбрать стартовую пятёрку' : '⇄ Замена'}
        </button>
      </div>
    );
  };

  const renderTeam = (side: Side) => {
    const team = side === 'home' ? home : away;
    const lineup = editing[side] ? renderRoster(side) : renderCourt(side);
    const actions = renderActions(side);

    return (
      <Card className="flex flex-col p-4">
        <div className="mb-4 flex items-center gap-3">
          <TeamBadge team={team.name} size="md" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-black">{team.name}</h3>
            <div className="mt-1 flex items-center gap-3 text-[11px] font-bold text-muted">
              <span className="flex items-center gap-1">
                Фолы
                <span className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className={`h-2 w-2 rounded-full ${
                        team.fouls >= n ? (team.fouls >= 5 ? 'bg-loss' : 'bg-accent') : 'bg-surface2'
                      }`}
                    />
                  ))}
                </span>
              </span>
              <span>Тайм-ауты {team.timeouts}</span>
            </div>
          </div>
          <button type="button" onClick={() => timeout(side)} className={btn.subtle}>
            Тайм-аут
          </button>
        </div>

        {/* Кнопки — с внешней стороны: у хозяев слева, у гостей справа; на телефоне — под составом. */}
        <div
          className={`flex flex-col-reverse gap-4 ${side === 'away' ? 'sm:flex-row-reverse' : 'sm:flex-row'}`}
        >
          {actions}
          {lineup}
        </div>
      </Card>
    );
  };

  const possessionButton = (side: Side) => (
    <button
      type="button"
      onClick={() => setPossession(side)}
      className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider transition ${
        possession === side ? 'bg-accent text-accentfg' : 'bg-surface2 text-muted hover:text-fg'
      }`}
    >
      {possession === side ? '● Мяч' : 'Мяч'}
    </button>
  );

  return (
    <section className="select-none">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-accent px-2 py-0.5 text-[10px] font-black tracking-wider text-accentfg">
            LIVE
          </span>
          <h1 className="text-lg font-black">Судейский столик</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={undo} disabled={history.length === 0} className={btn.ghost}>
            ↩ Отменить
          </button>
          <button type="button" onClick={resetMatch} className={btn.ghost}>
            Новый матч
          </button>
          <button type="button" onClick={finish} className={btn.primary}>
            Завершить и сохранить
          </button>
        </div>
      </div>

      {notice && (
        <p className="mb-3 rounded-lg border border-accent/40 bg-accentsoft px-3 py-2 text-xs font-bold text-accent">
          {notice}
        </p>
      )}

      <Card className="mb-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-4 sm:gap-3 sm:px-6">
        <div className="flex min-w-0 flex-col items-center gap-1 text-center sm:flex-row sm:gap-3 sm:text-left">
          <TeamBadge team={home.name} size="md" />
          <div className="min-w-0">
            <p className="hidden truncate text-sm font-black sm:block sm:text-base">{home.name}</p>
            <div className="sm:mt-1">{possessionButton('home')}</div>
          </div>
          <span className="font-mono text-3xl font-black tabular-nums sm:ml-auto sm:text-5xl">{home.score}</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-muted">{periodLabel}</span>
          <span className="font-mono text-3xl font-black tabular-nums text-accent sm:text-4xl">
            {mmss(timeLeft)}
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setRunning((value) => !value)}
              className={`rounded-lg px-4 py-1.5 text-xs font-black uppercase text-white transition active:scale-95 ${
                running ? 'bg-loss' : 'bg-win'
              }`}
            >
              {running ? 'Пауза' : 'Старт'}
            </button>
            <button
              type="button"
              title="Сбросить часы"
              onClick={() => {
                setRunning(false);
                setTimeLeft(PERIOD_SECONDS);
              }}
              className={btn.subtle}
            >
              ↺
            </button>
            <button type="button" onClick={nextQuarter} title="Следующий период" className={btn.subtle}>
              След.<span className="hidden sm:inline">&nbsp;период</span>
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-center gap-1 text-center sm:flex-row-reverse sm:gap-3 sm:text-right">
          <TeamBadge team={away.name} size="md" />
          <div className="min-w-0">
            <p className="hidden truncate text-sm font-black sm:block sm:text-base">{away.name}</p>
            <div className="sm:mt-1">{possessionButton('away')}</div>
          </div>
          <span className="font-mono text-3xl font-black tabular-nums sm:mr-auto sm:text-5xl">{away.score}</span>
        </div>
      </Card>

      <div className="mb-4 grid gap-4 xl:grid-cols-2">
        {renderTeam('home')}
        {renderTeam('away')}
      </div>

      <PlayByPlay
        events={events}
        homeTeam={home.name}
        awayTeam={away.name}
        title="Живой протокол"
        maxHeight="max-h-[320px]"
        emptyText="Выберите пятёрки, нажмите на игрока и фиксируйте действия кнопками сбоку."
        onClear={sessionId ? () => clearEvents(sessionId) : undefined}
      />
    </section>
  );
}

/**
 * До конца гидратации отдаём ту же разметку, что и сервер (черновик ещё не
 * прочитан), и только потом перемонтируем столик с восстановленным матчем.
 * Так состояние переживает F5 без ошибки гидратации.
 */
export default function ScorerPage() {
  const hydrated = useHydrated();
  const session = useClientStore('match-session', loadMatchSession, null);
  const judge = useJudge();

  // Столик доступен только судьям. Черновик матча при этом не трогаем:
  // после входа судья продолжит с того же места.
  if (judge.status === 'loading') return <RouteFallback />;
  if (judge.status === 'signed-out') {
    return (
      <section className="mx-auto max-w-md">
        <SectionTitle title="Судейский столик" subtitle="Доступ только для судей лиги" />
        <Card className="space-y-3 p-5">
          <p className="text-sm text-muted">
            Войдите под аккаунтом судьи, чтобы вести протокол матча. Смотреть игры
            можно без входа — в трансляции и на странице матча.
          </p>
          <Link href="/login" className={`${btn.primary} w-full`}>Вход для судей</Link>
        </Card>
      </section>
    );
  }

  return (
    <ScorerDesk
      key={hydrated ? 'restored' : 'initial'}
      initial={hydrated ? session : null}
      canPersist={hydrated}
    />
  );
}
