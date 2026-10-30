'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLeague } from '@/lib/providers';
import { aggregatePlayers, type PlayerSeason } from '@/lib/league-stats';
import { rosterOf } from '@/lib/league-data';
import { compareText, jersey, mmss, pct, perGame, teamColor } from '@/lib/format';
import { Card, EmptyState, SectionTitle, TeamBadge, btn } from '@/components/ui';

type Metric = {
  key: string;
  label: string;
  hint: string;
  /** Значение для сравнения — чем больше, тем лучше (если не указано обратное) */
  value: (player: PlayerSeason) => number;
  format: (value: number) => string;
  lowerIsBetter?: boolean;
};

/** Ключевые метрики — выносятся в карточки сравнения. */
const PRIMARY: Metric[] = [
  {
    key: 'ppg', label: 'PPG', hint: 'Очки за игру',
    value: (p) => perGame(p.pts, p.games), format: (v) => v.toFixed(1),
  },
  {
    key: 'rpg', label: 'RPG', hint: 'Подборы за игру',
    value: (p) => perGame(p.reb, p.games), format: (v) => v.toFixed(1),
  },
  {
    key: 'apg', label: 'APG', hint: 'Передачи за игру',
    value: (p) => perGame(p.ast, p.games), format: (v) => v.toFixed(1),
  },
  {
    key: 'fgp', label: 'FG%', hint: 'Реализация с игры',
    value: (p) => pct(p.fgm, p.fga), format: (v) => `${v}%`,
  },
  {
    key: 'pf', label: 'Фолы', hint: 'Фолы за игру — меньше лучше',
    value: (p) => perGame(p.fouls, p.games), format: (v) => v.toFixed(1),
    lowerIsBetter: true,
  },
];

/** Дополнительные метрики — в общей таблице. */
const SECONDARY: Metric[] = [
  {
    key: 'games', label: 'Матчи', hint: 'Сыграно матчей',
    value: (p) => p.games, format: (v) => String(v),
  },
  {
    key: 'min', label: 'Минуты', hint: 'Среднее время на площадке',
    value: (p) => Math.round(p.seconds / Math.max(1, p.games)), format: (v) => mmss(v),
  },
  {
    key: 'spg', label: 'SPG', hint: 'Перехваты за игру',
    value: (p) => perGame(p.stl, p.games), format: (v) => v.toFixed(1),
  },
  {
    key: 'bpg', label: 'BPG', hint: 'Блок-шоты за игру',
    value: (p) => perGame(p.blk, p.games), format: (v) => v.toFixed(1),
  },
  {
    key: 'topg', label: 'TO', hint: 'Потери за игру — меньше лучше',
    value: (p) => perGame(p.to, p.games), format: (v) => v.toFixed(1),
    lowerIsBetter: true,
  },
  {
    key: 'fg3p', label: '3P%', hint: 'Реализация трёхочковых',
    value: (p) => pct(p.fg3m, p.fg3a), format: (v) => `${v}%`,
  },
  {
    key: 'ftp', label: 'FT%', hint: 'Реализация штрафных',
    value: (p) => pct(p.ftm, p.fta), format: (v) => `${v}%`,
  },
  {
    key: 'eff', label: 'КПИ', hint: 'Коэффициент полезности за игру',
    value: (p) => perGame(p.eff, p.games), format: (v) => v.toFixed(1),
  },
];

/** -1 — лучше левый, 1 — лучше правый, 0 — поровну. */
function winner(metric: Metric, left: number, right: number): -1 | 0 | 1 {
  if (left === right) return 0;
  const leftBetter = metric.lowerIsBetter ? left < right : left > right;
  return leftBetter ? -1 : 1;
}

function PlayerPicker({
  label,
  value,
  onChange,
  players,
  accent,
}: {
  label: string;
  value: string;
  onChange: (key: string) => void;
  players: PlayerSeason[];
  accent: string;
}) {
  const byTeam = useMemo(() => {
    const map = new Map<string, PlayerSeason[]>();
    for (const player of players) {
      const list = map.get(player.team) ?? [];
      list.push(player);
      map.set(player.team, list);
    }
    return [...map.entries()].sort((a, b) => compareText(a[0], b[0]));
  }, [players]);

  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: accent }} />
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent"
      >
        <option value="">Не выбрано</option>
        {byTeam.map(([team, list]) => (
          <optgroup key={team} label={team}>
            {[...list]
              .sort((a, b) => b.pts / b.games - a.pts / a.games)
              .map((player) => (
                <option key={player.key} value={player.key}>
                  {player.number >= 0 ? `№${player.number} ` : ''}{player.name} · {perGame(player.pts, player.games)} очк.
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function PlayerHead({ player, side }: { player: PlayerSeason | null; side: 'left' | 'right' }) {
  if (!player) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center text-xs text-muted">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-line text-xl">
          ?
        </span>
        Выберите игрока
      </div>
    );
  }

  const profile = rosterOf(player.team).find((entry) => entry.name === player.name);

  return (
    <div className={`flex flex-col items-center gap-2 py-4 text-center ${side === 'left' ? 'sm:items-start sm:text-left' : 'sm:items-end sm:text-right'}`}>
      <span className="relative">
        <TeamBadge team={player.team} size="lg" />
        <span className="absolute -bottom-1 -right-1 flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-surface bg-accent px-1 text-[11px] font-black text-accentfg">
          {jersey(player.number)}
        </span>
      </span>
      <Link href={`/players/${encodeURIComponent(player.key)}`} className="text-base font-black hover:text-accent">
        {player.name}
      </Link>
      <span className="text-xs text-muted">
        {player.team}
        {profile && ` · ${profile.position}`}
      </span>
      <span className="text-[11px] text-muted">
        {player.games} матч(ей) · {mmss(Math.round(player.seconds / Math.max(1, player.games)))} в среднем
      </span>
    </div>
  );
}

function MetricRow({
  metric,
  left,
  right,
}: {
  metric: Metric;
  left: PlayerSeason | null;
  right: PlayerSeason | null;
}) {
  const leftValue = left ? metric.value(left) : 0;
  const rightValue = right ? metric.value(right) : 0;
  const result = left && right ? winner(metric, leftValue, rightValue) : 0;

  const total = leftValue + rightValue;
  const leftShare = total > 0 ? (leftValue / total) * 100 : 50;

  return (
    <div className="px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
        <span className={`w-16 text-left font-black tabular-nums ${result === -1 ? 'text-accent' : ''}`}>
          {left ? metric.format(leftValue) : '—'}
        </span>
        <span className="flex-1 text-center">
          <span className="block text-[11px] font-bold uppercase tracking-wide">{metric.label}</span>
          <span className="block text-[10px] text-muted">{metric.hint}</span>
        </span>
        <span className={`w-16 text-right font-black tabular-nums ${result === 1 ? 'text-accent' : ''}`}>
          {right ? metric.format(rightValue) : '—'}
        </span>
      </div>
      {/*
        Проигравшая половина всегда серая: если оба игрока из одной команды,
        цвет клуба совпал бы и полоса перестала бы читаться.
      */}
      <div className="flex h-1.5 overflow-hidden rounded-full bg-surface2">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${leftShare}%`,
            background: left ? (result === 1 ? 'var(--muted)' : teamColor(left.team)) : 'transparent',
            opacity: result === 1 ? 0.35 : 1,
          }}
        />
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${100 - leftShare}%`,
            background: right ? (result === -1 ? 'var(--muted)' : teamColor(right.team)) : 'transparent',
            opacity: result === -1 ? 0.35 : 1,
          }}
        />
      </div>
    </div>
  );
}

export default function CompareView({
  initialLeft,
  initialRight,
}: {
  initialLeft: string;
  initialRight: string;
}) {
  const { seasonMatches, allMatches, season, division } = useLeague();

  // Если в выбранном сезоне матчей ещё нет, сравниваем по всей истории.
  const players = useMemo(() => {
    const current = aggregatePlayers(seasonMatches).filter((player) => player.games > 0);
    return current.length > 0 ? current : aggregatePlayers(allMatches);
  }, [seasonMatches, allMatches]);

  const sorted = useMemo(
    () => [...players].sort((a, b) => b.pts / b.games - a.pts / a.games),
    [players],
  );

  // Ключи из query-строки принимаем только если такой игрок действительно есть.
  const pick = (key: string, fallback: string) =>
    sorted.some((player) => player.key === key) ? key : fallback;

  const defaultLeft = sorted[0];
  // По умолчанию берём лидера и лучшего из другой команды — так сравнение нагляднее.
  const defaultRight =
    sorted.find((player) => player.team !== defaultLeft?.team) ?? sorted[1];

  const [leftKey, setLeftKey] = useState(() => pick(initialLeft, defaultLeft?.key ?? ''));
  const [rightKey, setRightKey] = useState(() => pick(initialRight, defaultRight?.key ?? ''));

  const left = players.find((player) => player.key === leftKey) ?? null;
  const right = players.find((player) => player.key === rightKey) ?? null;

  const score = useMemo(() => {
    if (!left || !right) return { left: 0, right: 0 };
    let l = 0;
    let r = 0;
    for (const metric of [...PRIMARY, ...SECONDARY]) {
      const result = winner(metric, metric.value(left), metric.value(right));
      if (result === -1) l += 1;
      if (result === 1) r += 1;
    }
    return { left: l, right: r };
  }, [left, right]);

  if (players.length === 0) {
    return (
      <section>
        <SectionTitle title="Сравнение игроков" />
        <EmptyState
          text="Статистики пока нет — сравнивать некого."
          action={<Link href="/scorer" className={btn.primary}>Открыть судейский столик</Link>}
        />
      </section>
    );
  }

  const same = Boolean(left && right && left.key === right.key);

  return (
    <section>
      <SectionTitle
        title="Сравнение игроков"
        subtitle={`${division} · сезон ${season} · показатели в среднем за игру`}
        action={
          <button
            type="button"
            onClick={() => {
              setLeftKey(rightKey);
              setRightKey(leftKey);
            }}
            className={btn.ghost}
          >
            ⇄ Поменять местами
          </button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <PlayerPicker
          label="Игрок 1"
          value={leftKey}
          onChange={setLeftKey}
          players={sorted}
          accent={left ? teamColor(left.team) : 'var(--muted)'}
        />
        <PlayerPicker
          label="Игрок 2"
          value={rightKey}
          onChange={setRightKey}
          players={sorted}
          accent={right ? teamColor(right.team) : 'var(--muted)'}
        />
      </div>

      {same && (
        <p className="mb-4 rounded-lg bg-accentsoft px-3 py-2 text-xs font-bold text-accent">
          Выбран один и тот же игрок — укажите разных, чтобы увидеть сравнение.
        </p>
      )}

      <Card className="mb-4 overflow-hidden">
        <div className="grid grid-cols-2 gap-4 border-b border-line px-5 sm:grid-cols-[1fr_auto_1fr]">
          <PlayerHead player={left} side="left" />
          <div className="order-last col-span-2 flex flex-col items-center justify-center gap-1 pb-4 sm:order-none sm:col-span-1 sm:pb-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Выиграно показателей
            </span>
            <span className="text-2xl font-black tabular-nums">
              <span className={score.left > score.right ? 'text-accent' : ''}>{score.left}</span>
              <span className="mx-2 text-muted">:</span>
              <span className={score.right > score.left ? 'text-accent' : ''}>{score.right}</span>
            </span>
            <span className="text-[10px] text-muted">из {PRIMARY.length + SECONDARY.length}</span>
          </div>
          <PlayerHead player={right} side="right" />
        </div>

        <div className="divide-y divide-line">
          {PRIMARY.map((metric) => (
            <MetricRow key={metric.key} metric={metric} left={left} right={right} />
          ))}
        </div>
      </Card>

      <h2 className="mb-3 text-lg font-black">Дополнительные показатели</h2>
      <Card className="divide-y divide-line overflow-hidden">
        {SECONDARY.map((metric) => (
          <MetricRow key={metric.key} metric={metric} left={left} right={right} />
        ))}
      </Card>

      <p className="mt-3 text-xs text-muted">
        Подсветкой отмечено лучшее значение. Для фолов и потерь лучшим считается меньшее число.
      </p>
    </section>
  );
}
