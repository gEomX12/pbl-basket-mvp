'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLeague } from '@/lib/providers';
import { useClientStore } from '@/lib/client-store';
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
import { Card, SectionTitle, TeamBadge, btn, inputClass, labelClass } from '@/components/ui';
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
  { action: 'ast', label: 'АП', title: 'Результативная передача' },
  { action: 'reb_off', label: 'АТБ', title: 'Подбор в нападении' },
  { action: 'reb_def', label: 'ЗБ', title: 'Подбор в защите' },
  { action: 'stl', label: 'ПХ', title: 'Перехват' },
  { action: 'blk', label: 'БШ', title: 'Блок-шот' },
  { action: 'to', label: 'ПТ', title: 'Потеря' },
];

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

export default function ScorerPage() {
  const router = useRouter();
  const { season, division } = useLeague();

  const [started, setStarted] = useState(false);
  const [homeName, setHomeName] = useState(TEAMS[0].name);
  const [awayName, setAwayName] = useState(TEAMS[1].name);
  const [venue, setVenue] = useState(TEAMS[0].arena);
  const [stage, setStage] = useState<MatchStage>('regular');
  // Сегодняшняя дата доступна только в браузере: при пререндере `new Date()` запрещён.
  const today = useClientStore('today', todayIso, '');
  const [dateDraft, setDateDraft] = useState<string | null>(null);
  const date = dateDraft ?? today;
  const [time, setTime] = useState('19:00');

  const [home, setHome] = useState<TeamState>(() => buildTeam(TEAMS[0].name));
  const [away, setAway] = useState<TeamState>(() => buildTeam(TEAMS[1].name));
  const [onCourt, setOnCourt] = useState<Record<Side, string[]>>({ home: [], away: [] });

  const [quarter, setQuarter] = useState(1);
  const [timeLeft, setTimeLeft] = useState(PERIOD_SECONDS);
  const [running, setRunning] = useState(false);
  const [possession, setPossession] = useState<Side | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  // Идентификатор сессии = будущий id матча: лента событий сразу привязана
  // к записи, которая появится в архиве после финальной сирены.
  const [sessionId, setSessionId] = useState<string | null>(null);
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

  const allPlayers = useMemo(() => [...home.players, ...away.players], [home, away]);
  const selected = allPlayers.find((player) => player.id === selectedId) ?? null;
  const selectedSide: Side | null = home.players.some((p) => p.id === selectedId)
    ? 'home'
    : away.players.some((p) => p.id === selectedId)
      ? 'away'
      : null;

  const patch = (side: Side, updater: (prev: TeamState) => TeamState) => {
    if (side === 'home') setHome(updater);
    else setAway(updater);
  };

  const requireSelection = (): { player: Player; side: Side } | null => {
    if (!selected || !selectedSide) {
      setNotice('Сначала выберите игрока в составе команды.');
      return null;
    }
    setNotice(null);
    return { player: selected, side: selectedSide };
  };

  /* --------------------------- Действия ----------------------------- */

  const score = (points: ScoringPoints) => {
    const target = requireSelection();
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

  const miss = (points: ScoringPoints) => {
    const target = requireSelection();
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

  const foul = () => {
    const target = requireSelection();
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

  const boxStat = (action: BoxStatAction) => {
    const target = requireSelection();
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
    setOnCourt((prev) => {
      const current = prev[side];
      if (current.includes(id)) return { ...prev, [side]: current.filter((item) => item !== id) };
      if (current.length >= MAX_ON_COURT) {
        setNotice(`На площадке уже ${MAX_ON_COURT} игроков — сначала уберите кого-то.`);
        return prev;
      }
      setNotice(null);
      return { ...prev, [side]: [...current, id] };
    });
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
    router.push(`/matches/${encodeURIComponent(match.id)}`);
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
              setHistory([]);
              setQuarter(1);
              setTimeLeft(PERIOD_SECONDS);
              setSelectedId(null);
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

  const renderTeam = (side: Side) => {
    const team = side === 'home' ? home : away;
    const ids = onCourt[side];

    return (
      <Card className="flex min-h-0 flex-col p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-black">
            <TeamBadge team={team.name} size="sm" />
            <span className="truncate">{team.name}</span>
          </h3>
          <div className="flex gap-1">
            <button type="button" onClick={() => timeout(side)} className={btn.subtle}>
              Тайм-аут ({team.timeouts})
            </button>
            <span
              className={`rounded-md px-2 py-1.5 text-[11px] font-black ${
                team.fouls >= 5 ? 'bg-loss text-white' : 'bg-surface2 text-muted'
              }`}
            >
              Фолы {team.fouls}/5
            </span>
          </div>
        </div>

        <div className="scroll-thin max-h-[420px] flex-1 space-y-1.5 overflow-y-auto pr-1">
          {team.players.map((player) => {
            const active = player.id === selectedId;
            const playing = ids.includes(player.id);
            return (
              <div
                key={player.id}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 transition ${
                  active ? 'border-accent bg-accentsoft' : 'border-line bg-surface hover:border-accent/50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleOnCourt(side, player.id)}
                  title={playing ? 'Увести со площадки' : 'Выпустить на площадку'}
                  className={`h-5 w-5 shrink-0 rounded-full border-2 text-[10px] font-black ${
                    playing ? 'border-win bg-win text-white' : 'border-line text-muted'
                  }`}
                >
                  {playing ? '●' : ''}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(player.id);
                    setNotice(null);
                  }}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      <span className="mr-1.5 font-mono text-accent">{jersey(player.number)}</span>
                      {player.name}
                    </span>
                    <span className="mt-1 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span
                          key={n}
                          className={`inline-block h-2 w-2.5 rounded-sm ${
                            player.fouls >= n ? (n === 5 ? 'bg-loss' : 'bg-accent') : 'bg-surface2'
                          }`}
                        />
                      ))}
                      <span className="ml-1 text-[10px] text-muted">{mmss(player.seconds)}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right font-mono text-[10px] text-muted">
                    <span className="block text-sm font-black text-fg">{player.points}</span>
                    {player.ast}А {rebTotal(player)}П {player.stl}Х
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  return (
    <section className="select-none">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="rounded bg-accent px-2.5 py-1 text-xs font-black tracking-wider text-accentfg">
            LIVE STATS
          </span>
          <h1 className="mt-2 text-xl font-black">Судейский столик</h1>
          <p className="text-xs text-muted">
            {selected
              ? `Активный: ${jersey(selected.number)} ${selected.name} · ${selected.points} очк.`
              : 'Выберите игрока, затем фиксируйте действия'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={undo} disabled={history.length === 0} className={btn.ghost}>
            ↩ Отменить
          </button>
          <button type="button" onClick={() => setStarted(false)} className={btn.ghost}>
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

      <Card className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-5">
        <button
          type="button"
          onClick={() => setPossession('home')}
          className={`rounded-lg p-2 text-left transition ${
            possession === 'home' ? 'bg-accentsoft ring-1 ring-accent' : ''
          }`}
        >
          <span className="block truncate text-base font-black sm:text-xl">{home.name}</span>
          <span className="text-[11px] text-muted">
            {possession === 'home' ? 'Владение ◀' : 'Нажмите, чтобы отметить владение'}
          </span>
        </button>

        <div className="flex flex-col items-center">
          <div className="text-[11px] font-black uppercase tracking-widest text-muted">
            Четверть <span className="text-accent">{quarter > 4 ? `ОТ${quarter - 4}` : quarter}</span>
          </div>
          <div className="my-2 rounded-lg border border-line bg-surface2 px-4 py-1.5 font-mono text-3xl font-black tabular-nums text-accent sm:text-4xl">
            {mmss(timeLeft)}
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            <button
              type="button"
              onClick={() => setRunning((value) => !value)}
              className={`rounded px-4 py-1 text-xs font-black uppercase text-white ${
                running ? 'bg-loss' : 'bg-win'
              }`}
            >
              {running ? 'Пауза' : 'Старт'}
            </button>
            <button
              type="button"
              onClick={() => {
                setRunning(false);
                setTimeLeft(PERIOD_SECONDS);
              }}
              className={btn.subtle}
            >
              Сброс
            </button>
            <button type="button" onClick={nextQuarter} className={btn.subtle}>
              След. четверть
            </button>
          </div>
          <div className="mt-3 font-mono text-4xl font-black tabular-nums sm:text-5xl">
            {home.score} <span className="text-muted">:</span> {away.score}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPossession('away')}
          className={`rounded-lg p-2 text-right transition ${
            possession === 'away' ? 'bg-accentsoft ring-1 ring-accent' : ''
          }`}
        >
          <span className="block truncate text-base font-black sm:text-xl">{away.name}</span>
          <span className="text-[11px] text-muted">
            {possession === 'away' ? '▶ Владение' : 'Нажмите, чтобы отметить владение'}
          </span>
        </button>
      </Card>

      <Card className="mb-4 flex flex-wrap items-center gap-1.5 p-3">
        <span className="mr-1 text-[11px] font-black uppercase tracking-wider text-muted">Очки</span>
        {([1, 2, 3] as ScoringPoints[]).map((points) => (
          <button
            key={`made-${points}`}
            type="button"
            onClick={() => score(points)}
            className="rounded bg-win px-3 py-1.5 text-xs font-black text-white"
          >
            +{points}
          </button>
        ))}
        {([1, 2, 3] as ScoringPoints[]).map((points) => (
          <button
            key={`miss-${points}`}
            type="button"
            onClick={() => miss(points)}
            title={`Промах ${points}-очкового`}
            className="rounded bg-surface2 px-3 py-1.5 text-xs font-black text-muted hover:text-fg"
          >
            −{points}
          </button>
        ))}

        <span className="mx-2 h-5 w-px bg-line" />

        <span className="mr-1 text-[11px] font-black uppercase tracking-wider text-muted">Статистика</span>
        {BOX_ACTIONS.map((item) => (
          <button
            key={item.action}
            type="button"
            title={item.title}
            onClick={() => boxStat(item.action)}
            className="rounded bg-surface2 px-3 py-1.5 text-xs font-black hover:bg-accentsoft hover:text-accent"
          >
            {item.label}
          </button>
        ))}

        <button
          type="button"
          onClick={foul}
          className="ml-auto rounded bg-loss px-3 py-1.5 text-xs font-black text-white"
        >
          Фол
        </button>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_300px]">
        {renderTeam('home')}
        {renderTeam('away')}

        <PlayByPlay
          events={events}
          homeTeam={home.name}
          awayTeam={away.name}
          title="Живой протокол"
          maxHeight="max-h-[420px]"
          emptyText="Отметьте пятёрки на площадке, выберите игрока и фиксируйте действия."
          onClear={sessionId ? () => clearEvents(sessionId) : undefined}
        />
      </div>
    </section>
  );
}
