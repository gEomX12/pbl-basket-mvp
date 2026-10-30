'use client';

import Link from 'next/link';
import { useAuth, useLeague } from '@/lib/providers';
import { useClientStore } from '@/lib/client-store';
import { loadStoredMatches } from '@/lib/storage';
import { fmtDate } from '@/lib/format';
import { Card, EmptyState, SectionTitle, StatTile, TeamBadge, btn } from '@/components/ui';
import type { ArchivedMatch } from '@/types/match';

const NO_MATCHES: ArchivedMatch[] = [];

const ROLE_LABEL: Record<string, string> = {
  fan: 'Болельщик',
  coach: 'Тренер',
  scorer: 'Оператор столика',
};

export default function ProfileView({ login }: { login: string }) {
  const { accounts, account, favorites, signOut, ready } = useAuth();
  const { allMatches } = useLeague();
  const ownMatches = useClientStore('matches', loadStoredMatches, NO_MATCHES);

  const user = accounts.find((item) => item.login === login) ?? null;
  const isOwn = account?.login === login;

  if (!ready) {
    return <p className="py-12 text-center text-sm text-muted">Загрузка…</p>;
  }

  if (!user) {
    return (
      <section>
        <Link href="/login" className="text-sm text-muted hover:text-accent">← Вход</Link>
        <EmptyState
          text={`Пользователь «${login}» не найден в этом браузере.`}
          action={<Link href="/login" className={btn.primary}>Создать аккаунт</Link>}
        />
      </section>
    );
  }

  return (
    <section>
      <SectionTitle title="Страница пользователя" subtitle={`@${user.login}`} />

      <Card className="mb-4 flex flex-wrap items-center gap-5 p-5">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-3xl font-black text-accentfg">
          {user.displayName.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black">{user.displayName}</h1>
          <p className="text-sm text-muted">
            {ROLE_LABEL[user.role] ?? user.role} · команда:{' '}
            <Link href={`/teams/${encodeURIComponent(user.favoriteTeam)}`} className="font-semibold hover:text-accent">
              {user.favoriteTeam}
            </Link>
          </p>
          <p className="mt-0.5 text-xs text-muted">
            В лиге с {fmtDate(user.createdAt.slice(0, 10))}
          </p>
        </div>
        {isOwn && (
          <div className="flex flex-wrap gap-2">
            <Link href="/settings" className={btn.primary}>Редактировать</Link>
            <button type="button" onClick={signOut} className={btn.ghost}>Выход</button>
          </div>
        )}
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Избранных команд" value={isOwn ? favorites.length : '—'} accent />
        <StatTile label="Своих протоколов" value={isOwn ? ownMatches.length : '—'} />
        <StatTile label="Матчей в лиге" value={allMatches.filter((m) => m.status === 'final').length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <h2 className="border-b border-line px-4 py-3 text-sm font-black">
            {isOwn ? 'Избранные команды' : 'Команда'}
          </h2>
          {isOwn ? (
            favorites.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-muted">Нет избранных команд.</p>
                <Link href="/teams" className={`${btn.subtle} mt-3`}>Выбрать команду</Link>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {favorites.map((team) => (
                  <li key={team}>
                    <Link
                      href={`/teams/${encodeURIComponent(team)}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface2"
                    >
                      <TeamBadge team={team} size="sm" />
                      <span className="flex-1 text-xs font-bold">{team}</span>
                      <span className="text-accent">★</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <div className="px-4 py-6">
              <Link
                href={`/teams/${encodeURIComponent(user.favoriteTeam)}`}
                className="flex items-center gap-3 hover:text-accent"
              >
                <TeamBadge team={user.favoriteTeam} size="md" />
                <span className="text-sm font-bold">{user.favoriteTeam}</span>
              </Link>
            </div>
          )}
        </Card>
      </div>

      {isOwn && ownMatches.length > 0 && (
        <>
          <h2 className="mb-3 mt-6 text-lg font-black">Мои протоколы</h2>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {ownMatches.map((match) => (
                <li key={match.id}>
                  <Link
                    href={`/matches/${encodeURIComponent(match.id)}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface2"
                  >
                    <span className="w-28 shrink-0 text-xs text-muted">{fmtDate(match.date)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {match.home.name} — {match.away.name}
                    </span>
                    <span className="font-black tabular-nums">
                      {match.home.score}:{match.away.score}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </section>
  );
}
