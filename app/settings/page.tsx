'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useAuth, useLeague, useTheme } from '@/lib/providers';
import { useClientStore } from '@/lib/client-store';
import { clearAll, loadProfile, saveProfile } from '@/lib/storage';
import { DEFAULT_PROFILE, TEAMS } from '@/lib/league-data';
import { Card, SectionTitle, btn, inputClass, labelClass } from '@/components/ui';
import type { ProfileRole, UserProfile } from '@/types/match';

const ROLES: { value: ProfileRole; label: string }[] = [
  { value: 'fan', label: 'Болельщик' },
  { value: 'coach', label: 'Тренер' },
  { value: 'scorer', label: 'Оператор столика' },
];


export default function SettingsPage() {
  const { setTheme } = useTheme();
  const { season, setSeason, seasons, division, setDivision, divisions } = useLeague();
  const { account, update } = useAuth();
  const storedProfile = useClientStore('profile', loadProfile, DEFAULT_PROFILE);
  // Черновик правок; пока его нет, показываем актуальный профиль.
  const [draft, setDraft] = useState<UserProfile | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const base: UserProfile = account
    ? { displayName: account.displayName, role: account.role, club: account.favoriteTeam }
    : storedProfile;
  const form = draft ?? base;
  const setForm = (next: UserProfile) => {
    setDraft(next);
    setSaved(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    saveProfile(form);
    if (account) {
      update({ displayName: form.displayName, role: form.role, club: form.club, favoriteTeam: form.club });
    }
    setDraft(null);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const resetData = () => {
    clearAll();
    setConfirmReset(false);
    setDraft(null);
    window.location.reload();
  };

  return (
    <section className="mx-auto max-w-3xl">
      <SectionTitle title="Настройки" subtitle="Профиль, оформление и параметры отображения" />

      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-black">Оформление</h2>
          {/*
            Активное состояние подсвечивает CSS по data-theme, а не React-состояние:
            сервер не знает выбранную тему, и любая разметка «по теме» разошлась бы
            при гидратации.
          */}
          <div className="flex w-fit gap-1 rounded-xl border border-line bg-surface2 p-1">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className="theme-opt theme-opt-light rounded-lg px-3.5 py-1.5 text-sm font-bold transition"
            >
              Светлая тема
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className="theme-opt theme-opt-dark rounded-lg px-3.5 py-1.5 text-sm font-bold transition"
            >
              Тёмная тема
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Выбор сохраняется в этом браузере и применяется ко всем страницам.
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-black">Турнир по умолчанию</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className={labelClass}>Дивизион</span>
              <select
                value={division}
                onChange={(event) => setDivision(event.target.value)}
                className={inputClass}
              >
                {divisions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Сезон</span>
              <select
                value={season}
                onChange={(event) => setSeason(event.target.value)}
                className={inputClass}
              >
                {seasons.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
        </Card>

        <form onSubmit={submit}>
          <Card className="space-y-4 p-5">
            <h2 className="text-sm font-black">Профиль</h2>

            {!account && (
              <p className="rounded-lg bg-surface2 px-3 py-2 text-[11px] text-muted">
                Вы не вошли в аккаунт — настройки сохранятся как гостевые.{' '}
                <Link href="/login" className="font-bold text-accent">Войти</Link>
              </p>
            )}

            <label className="block space-y-1.5">
              <span className={labelClass}>Имя</span>
              <input
                value={form.displayName}
                onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                className={inputClass}
                placeholder="Как вас показывать"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className={labelClass}>Роль</span>
                <select
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value as ProfileRole })}
                  className={inputClass}
                >
                  {ROLES.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className={labelClass}>Клуб</span>
                <select
                  value={form.club}
                  onChange={(event) => setForm({ ...form, club: event.target.value })}
                  className={inputClass}
                >
                  {TEAMS.map((item) => (
                    <option key={item.name} value={item.name}>{item.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <button type="submit" className={`${btn.primary} w-full`}>
              {saved ? 'Сохранено' : 'Сохранить профиль'}
            </button>
          </Card>
        </form>

        <Card className="p-5">
          <h2 className="mb-2 text-sm font-black">Данные браузера</h2>
          <p className="mb-4 text-xs text-muted">
            Протоколы, аккаунты и заявки хранятся в localStorage этого браузера.
            Сброс удалит их безвозвратно; матчи лиги при этом вернутся к исходным.
          </p>
          {confirmReset ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={resetData} className={`${btn.primary} bg-loss`}>
                Да, удалить все данные
              </button>
              <button type="button" onClick={() => setConfirmReset(false)} className={btn.ghost}>
                Отмена
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmReset(true)} className={btn.ghost}>
              Сбросить локальные данные
            </button>
          )}
        </Card>
      </div>
    </section>
  );
}
