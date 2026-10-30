'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useAuth, useLeague } from '@/lib/providers';
import { TEAMS } from '@/lib/league-data';
import { Card, SectionTitle, Tabs, btn, inputClass, labelClass } from '@/components/ui';
import type { ProfileRole } from '@/types/match';

type Mode = 'signin' | 'signup';

const ROLES: { value: ProfileRole; label: string }[] = [
  { value: 'fan', label: 'Болельщик' },
  { value: 'coach', label: 'Тренер' },
  { value: 'scorer', label: 'Оператор столика' },
];

export default function LoginPage() {
  const router = useRouter();
  const { account, signIn, signUp, signOut } = useAuth();
  const { divisions } = useLeague();
  const [mode, setMode] = useState<Mode>('signin');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<ProfileRole>('fan');
  const [favoriteTeam, setFavoriteTeam] = useState(TEAMS[0].name);
  const [error, setError] = useState('');

  if (account) {
    return (
      <section className="mx-auto max-w-md">
        <SectionTitle title="Вы уже вошли" subtitle={`Аккаунт: ${account.displayName}`} />
        <Card className="space-y-3 p-5">
          <p className="text-sm text-muted">
            Логин <b className="text-fg">{account.login}</b> · роль{' '}
            {ROLES.find((item) => item.value === account.role)?.label}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/profile/${encodeURIComponent(account.login)}`} className={btn.primary}>
              Моя страница
            </Link>
            <Link href="/settings" className={btn.ghost}>Настройки</Link>
            <button type="button" onClick={signOut} className={btn.ghost}>Выход из аккаунта</button>
          </div>
        </Card>
      </section>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (mode === 'signin') {
      const result = signIn(login, password);
      if (!result.ok) {
        setError(result.error ?? 'Ошибка при запросе');
        return;
      }
      router.push(`/profile/${encodeURIComponent(login.trim())}`);
      return;
    }

    if (login.trim().length < 3) {
      setError('Логин — минимум 3 символа');
      return;
    }
    if (password.length < 4) {
      setError('Пароль — минимум 4 символа');
      return;
    }
    if (password !== repeat) {
      setError('Пароли не совпадают');
      return;
    }

    const result = signUp({
      login: login.trim(),
      password,
      displayName: displayName.trim() || login.trim(),
      role,
      club: favoriteTeam,
      favoriteTeam,
    });
    if (!result.ok) {
      setError(result.error ?? 'Ошибка при запросе');
      return;
    }
    router.push(`/profile/${encodeURIComponent(login.trim())}`);
  };

  return (
    <section className="mx-auto max-w-md">
      <SectionTitle
        title={mode === 'signin' ? 'Вход в аккаунт' : 'Регистрация'}
        subtitle="Аккаунт нужен для избранных команд и судейского столика"
      />

      <div className="mb-4">
        <Tabs
          value={mode}
          onChange={(value) => {
            setMode(value);
            setError('');
          }}
          options={[
            { value: 'signin', label: 'Вход' },
            { value: 'signup', label: 'Регистрация' },
          ]}
        />
      </div>

      <form onSubmit={submit} noValidate>
        <Card className="space-y-4 p-5">
          <label className="block space-y-1.5">
            <span className={labelClass}>{mode === 'signin' ? 'Логин' : 'Придумайте логин'}</span>
            <input
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              className={inputClass}
              autoComplete="username"
              placeholder="Ваш логин"
            />
          </label>

          {mode === 'signup' && (
            <label className="block space-y-1.5">
              <span className={labelClass}>Как вас показывать</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className={inputClass}
                placeholder="Имя и фамилия"
              />
            </label>
          )}

          <label className="block space-y-1.5">
            <span className={labelClass}>Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </label>

          {mode === 'signup' && (
            <>
              <label className="block space-y-1.5">
                <span className={labelClass}>Повторите пароль</span>
                <input
                  type="password"
                  value={repeat}
                  onChange={(event) => setRepeat(event.target.value)}
                  className={inputClass}
                  autoComplete="new-password"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className={labelClass}>Роль</span>
                  <select
                    value={role}
                    onChange={(event) => setRole(event.target.value as ProfileRole)}
                    className={inputClass}
                  >
                    {ROLES.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className={labelClass}>Команда</span>
                  <select
                    value={favoriteTeam}
                    onChange={(event) => setFavoriteTeam(event.target.value)}
                    className={inputClass}
                  >
                    {TEAMS.map((item) => (
                      <option key={item.name} value={item.name}>{item.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="text-[11px] text-muted">
                Дивизионы лиги: {divisions.join(', ')}. Данные аккаунта хранятся только в вашем браузере.
              </p>
            </>
          )}

          {error && (
            <p className="rounded-lg bg-loss/10 px-3 py-2 text-xs font-bold text-loss">{error}</p>
          )}

          <button type="submit" className={`${btn.primary} w-full`}>
            {mode === 'signin' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </Card>
      </form>
    </section>
  );
}
