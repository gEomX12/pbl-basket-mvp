'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLeague } from '@/lib/providers';
import { useLiveFeed } from '@/lib/live-feed';
import { headToHead } from '@/lib/standings';
import { teamTotals } from '@/lib/league-stats';
import { fmtDate, pct, weekday } from '@/lib/format';
import BoxScoreTable from '@/components/BoxScoreTable';
import PlayByPlay from '@/components/PlayByPlay';
import { Card, EmptyState, StatusBadge, Tabs, TeamBadge, btn } from '@/components/ui';
import { STAGES } from '@/lib/league-data';
import type { ArchivedMatch } from '@/types/match';

type Tab = 'box' | 'compare' | 'periods' | 'h2h' | 'feed';

function ComparisonRow({
  label,
  home,
  away,
  suffix = '',
}: {
  label: string;
  home: number;
  away: number;
  suffix?: string;
}) {
  const total = home + away || 1;
  const homeShare = (home / total) * 100;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className={`font-black tabular-nums ${home >= away ? 'text-accent' : ''}`}>
          {home}{suffix}
        </span>
        <span className="text-muted">{label}</span>
        <span className={`font-black tabular-nums ${away >= home ? 'text-accent' : ''}`}>
          {away}{suffix}
        </span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-surface2">
        <div className="h-full bg-accent" style={{ width: `${homeShare}%` }} />
        <div className="h-full bg-muted/40" style={{ width: `${100 - homeShare}%` }} />
      </div>
    </div>
  );
}

function PeriodTable({ match }: { match: ArchivedMatch }) {
  const periods = Math.max(match.home.quarters.length, match.away.quarters.length);
  if (periods === 0) return <p className="text-sm text-muted">Матч ещё не начался.</p>;

  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead className="bg-surface2 text-muted">
          <tr>
            <th className="px-3 py-2 text-left font-bold">Команда</th>
            {Array.from({ length: periods }, (_, index) => (
              <th key={index} className="px-3 py-2 font-bold">
                {index < 4 ? `${index + 1}Ч` : `ОТ${index - 3}`}
              </th>
            ))}
            <th className="px-3 py-2 font-bold text-accent">Итог</th>
          </tr>
        </thead>
        <tbody>
          {[match.home, match.away].map((side) => (
            <tr key={side.name} className="border-t border-line text-center">
              <td className="px-3 py-2 text-left font-semibold">
                <span className="inline-flex items-center gap-2">
                  <TeamBadge team={side.name} size="sm" />
                  {side.name}
                </span>
              </td>
              {Array.from({ length: periods }, (_, index) => (
                <td key={index} className="px-3 py-2 tabular-nums">
                  {side.quarters[index] ?? '—'}
                </td>
              ))}
              <td className="px-3 py-2 font-black tabular-nums text-accent">{side.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MatchView({ matchId }: { matchId: string }) {
  const id = matchId;
  const { allMatches } = useLeague();
  const [tab, setTab] = useState<Tab>('box');
  const events = useLiveFeed(matchId);
  const [copied, setCopied] = useState(false);

  const match = allMatches.find((item) => item.id === id);

  const h2h = useMemo(
    () => (match ? headToHead(allMatches, match.home.name, match.away.name).filter((m) => m.status === 'final') : []),
    [allMatches, match],
  );

  if (!match) {
    return (
      <section>
        <Link href="/schedule" className="text-sm text-muted hover:text-accent">← Расписание</Link>
        <EmptyState text="Матч не найден." />
      </section>
    );
  }

  const played = match.status !== 'scheduled';
  const homeTotals = teamTotals(match.home.players);
  const awayTotals = teamTotals(match.away.players);
  const stageLabel = STAGES.find((item) => item.value === match.stage)?.label ?? match.stage;

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section>
      <Link href="/schedule" className="text-sm text-muted hover:text-accent">← Расписание</Link>

      <Card className="my-4 px-5 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
          <StatusBadge status={match.status} period={match.period} />
          <span>{fmtDate(match.date)}, {weekday(match.date)} · {match.time}</span>
          <span>· {match.venue}</span>
          <span className="rounded-md bg-surface2 px-2 py-0.5 font-bold">{stageLabel}</span>
          <span>· {match.division}, сезон {match.season}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <Link
            href={`/teams/${encodeURIComponent(match.home.name)}`}
            className="flex flex-col items-center gap-2 text-center hover:text-accent"
          >
            <TeamBadge team={match.home.name} size="lg" />
            <span className="text-sm font-black sm:text-lg">{match.home.name}</span>
            <span className="text-[11px] text-muted">Хозяева</span>
          </Link>

          <div className="text-center">
            {played ? (
              <div className="text-4xl font-black tabular-nums sm:text-5xl">
                <span className={match.home.score > match.away.score ? 'text-accent' : ''}>
                  {match.home.score}
                </span>
                <span className="mx-2 text-muted">:</span>
                <span className={match.away.score > match.home.score ? 'text-accent' : ''}>
                  {match.away.score}
                </span>
              </div>
            ) : (
              <div className="text-2xl font-black text-muted">{match.time}</div>
            )}
            {match.status === 'live' && (
              <div className="mt-1 text-xs font-bold text-live">
                {match.period}-я четверть · {match.clock}
              </div>
            )}
          </div>

          <Link
            href={`/teams/${encodeURIComponent(match.away.name)}`}
            className="flex flex-col items-center gap-2 text-center hover:text-accent"
          >
            <TeamBadge team={match.away.name} size="lg" />
            <span className="text-sm font-black sm:text-lg">{match.away.name}</span>
            <span className="text-[11px] text-muted">Гости</span>
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {match.status === 'live' && (
            <Link href={`/stream/${encodeURIComponent(match.id)}`} className={btn.primary}>
              Смотреть трансляцию
            </Link>
          )}
          {match.video && (
            <a href={match.video} target="_blank" rel="noreferrer noopener" className={btn.ghost}>
              Видеообзор ↗
            </a>
          )}
          <button type="button" onClick={share} className={btn.ghost}>
            {copied ? 'Ссылка скопирована' : 'Поделиться'}
          </button>
        </div>
      </Card>

      {!played ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted">
            Матч ещё не сыгран. Протокол и статистика появятся здесь сразу после финальной сирены.
          </p>
          <Link href="/scorer" className={`${btn.primary} mt-4`}>Открыть судейский столик</Link>
        </Card>
      ) : (
        <>
          <div className="mb-4">
            <Tabs
              value={tab}
              onChange={setTab}
              options={[
                { value: 'box', label: 'Протокол' },
                { value: 'compare', label: 'Сравнение' },
                { value: 'periods', label: 'По четвертям' },
                ...(events.length > 0
                  ? ([{ value: 'feed', label: `Ход матча · ${events.length}` }] as const)
                  : []),
                { value: 'h2h', label: 'Личные встречи' },
              ]}
            />
          </div>

          {tab === 'box' && <BoxScoreTable home={match.home} away={match.away} />}

          {tab === 'feed' && (
            <PlayByPlay
              events={events}
              homeTeam={match.home.name}
              awayTeam={match.away.name}
              title="Живой протокол матча"
              maxHeight="max-h-[640px]"
            />
          )}

          {tab === 'compare' && (
            <Card className="p-5">
              <div className="mb-5 flex items-center justify-between text-sm font-black">
                <span>{match.home.name}</span>
                <span className="text-muted">Весь матч</span>
                <span>{match.away.name}</span>
              </div>
              <div className="space-y-4">
                <ComparisonRow label="Очки" home={homeTotals.pts} away={awayTotals.pts} />
                <ComparisonRow label="Реализация с игры" home={pct(homeTotals.fgm, homeTotals.fga)} away={pct(awayTotals.fgm, awayTotals.fga)} suffix="%" />
                <ComparisonRow label="Трёхочковые" home={homeTotals.fg3m} away={awayTotals.fg3m} />
                <ComparisonRow label="Штрафные" home={homeTotals.ftm} away={awayTotals.ftm} />
                <ComparisonRow label="Подборы" home={homeTotals.reb} away={awayTotals.reb} />
                <ComparisonRow label="Передачи" home={homeTotals.ast} away={awayTotals.ast} />
                <ComparisonRow label="Перехваты" home={homeTotals.stl} away={awayTotals.stl} />
                <ComparisonRow label="Блок-шоты" home={homeTotals.blk} away={awayTotals.blk} />
                <ComparisonRow label="Потери" home={homeTotals.to} away={awayTotals.to} />
                <ComparisonRow label="Фолы" home={homeTotals.fouls} away={awayTotals.fouls} />
              </div>
            </Card>
          )}

          {tab === 'periods' && (
            <Card className="p-4">
              <PeriodTable match={match} />
            </Card>
          )}

          {tab === 'h2h' && (
            <Card className="overflow-hidden">
              {h2h.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">Личных встреч пока не было.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {h2h.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/matches/${encodeURIComponent(item.id)}`}
                        className={`flex items-center gap-3 px-4 py-3 hover:bg-surface2 ${
                          item.id === match.id ? 'bg-accentsoft' : ''
                        }`}
                      >
                        <span className="w-32 shrink-0 text-xs text-muted">{fmtDate(item.date)}</span>
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {item.home.name} — {item.away.name}
                        </span>
                        <span className="font-black tabular-nums">
                          {item.home.score}:{item.away.score}
                        </span>
                        <span className="hidden text-[11px] text-muted sm:block">{item.season}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </>
      )}
    </section>
  );
}
