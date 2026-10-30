'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAuth, useLeague } from '@/lib/providers';
import { computeStandings } from '@/lib/standings';
import { TEAMS } from '@/lib/league-data';
import { signed } from '@/lib/format';
import { Card, EmptyState, SectionTitle, Tabs, TeamBadge, btn, inputClass } from '@/components/ui';

type View = 'grid' | 'list';

export default function TeamsPage() {
  const { seasonMatches, division, season } = useLeague();
  const { favorites, toggleFavorite } = useAuth();
  const [view, setView] = useState<View>('grid');
  const [query, setQuery] = useState('');

  const standings = useMemo(() => computeStandings(seasonMatches), [seasonMatches]);

  const teams = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TEAMS.filter((team) => team.division === division)
      .filter(
        (team) =>
          !q ||
          team.name.toLowerCase().includes(q) ||
          team.short.toLowerCase().includes(q) ||
          team.coach.toLowerCase().includes(q),
      )
      .map((team) => ({
        info: team,
        row: standings.find((item) => item.team === team.name),
        place: standings.findIndex((item) => item.team === team.name) + 1,
      }))
      .sort((a, b) => (a.place || 99) - (b.place || 99));
  }, [division, query, standings]);

  return (
    <section>
      <SectionTitle
        title="Команды"
        subtitle={`${division} · сезон ${season} · команд: ${teams.length}`}
        action={
          <Link href="/request" className={btn.ghost}>
            Заявить команду
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск команды..."
          aria-label="Поиск команды"
          className={`${inputClass} max-w-xs`}
        />
        <Tabs
          value={view}
          onChange={setView}
          size="sm"
          options={[
            { value: 'grid', label: 'Плитка' },
            { value: 'list', label: 'Список' },
          ]}
        />
      </div>

      {teams.length === 0 ? (
        <EmptyState text="Команды не найдены." />
      ) : view === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map(({ info, row, place }) => {
            const isFavorite = favorites.includes(info.name);
            return (
              <Card key={info.name} className="relative p-5">
                <button
                  type="button"
                  onClick={() => toggleFavorite(info.name)}
                  aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                  title={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                  className={`absolute right-3 top-3 text-lg leading-none transition ${
                    isFavorite ? 'text-accent' : 'text-muted hover:text-accent'
                  }`}
                >
                  {isFavorite ? '★' : '☆'}
                </button>

                <Link href={`/teams/${encodeURIComponent(info.name)}`} className="flex flex-col items-center text-center">
                  <TeamBadge team={info.name} size="lg" />
                  <h2 className="mt-3 text-base font-black">{info.name}</h2>
                  <p className="text-xs text-muted">
                    {info.coach ? `Тренер: ${info.coach}` : 'Тренер не указан'}
                  </p>

                  <div className="mt-4 grid w-full grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-lg font-black tabular-nums text-accent">{place || '—'}</div>
                      <div className="text-[10px] uppercase text-muted">Место</div>
                    </div>
                    <div>
                      <div className="text-lg font-black tabular-nums">
                        {row ? `${row.w}-${row.l}` : '0-0'}
                      </div>
                      <div className="text-[10px] uppercase text-muted">В-П</div>
                    </div>
                    <div>
                      <div className={`text-lg font-black tabular-nums ${(row?.diff ?? 0) >= 0 ? 'text-win' : 'text-loss'}`}>
                        {signed(row?.diff ?? 0)}
                      </div>
                      <div className="text-[10px] uppercase text-muted">+/−</div>
                    </div>
                  </div>

                  <span className="mt-4 text-xs font-bold text-accent">Страница команды →</span>
                </Link>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface2 text-muted">
              <tr>
                <th className="px-3 py-2.5 text-left font-bold">#</th>
                <th className="px-3 py-2.5 text-left font-bold">Команда</th>
                <th className="px-3 py-2.5 text-left font-bold">Код</th>
                <th className="px-3 py-2.5 text-left font-bold">Тренер</th>
                <th className="px-3 py-2.5 font-bold">В-П</th>
                <th className="px-3 py-2.5 font-bold">+/−</th>
                <th className="px-3 py-2.5 font-bold">О</th>
              </tr>
            </thead>
            <tbody>
              {teams.map(({ info, row, place }) => (
                <tr key={info.name} className="border-t border-line text-center hover:bg-surface2">
                  <td className="px-3 py-2.5 text-left text-muted">{place || '—'}</td>
                  <td className="px-3 py-2.5 text-left">
                    <Link href={`/teams/${encodeURIComponent(info.name)}`} className="inline-flex items-center gap-2 font-semibold hover:text-accent">
                      <TeamBadge team={info.name} size="sm" />
                      {info.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-left text-muted">{info.short}</td>
                  <td className="px-3 py-2.5 text-left text-muted">{info.coach}</td>
                  <td className="px-3 py-2.5 tabular-nums">{row ? `${row.w}-${row.l}` : '0-0'}</td>
                  <td className={`px-3 py-2.5 tabular-nums ${(row?.diff ?? 0) >= 0 ? 'text-win' : 'text-loss'}`}>
                    {signed(row?.diff ?? 0)}
                  </td>
                  <td className="px-3 py-2.5 font-black tabular-nums text-accent">{row?.pts ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </section>
  );
}
