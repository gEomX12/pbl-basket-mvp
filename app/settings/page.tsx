'use client';

import { useState } from 'react';
import { useLeague, useTheme } from '@/lib/providers';
import { clearAll } from '@/lib/storage';
import { Card, SectionTitle, btn, inputClass, labelClass } from '@/components/ui';

export default function SettingsPage() {
  const { setTheme } = useTheme();
  const { season, setSeason, seasons, division, setDivision, divisions } = useLeague();
  const [confirmReset, setConfirmReset] = useState(false);

  const resetData = () => {
    clearAll();
    setConfirmReset(false);
    window.location.reload();
  };

  return (
    <section className="mx-auto max-w-3xl">
      <SectionTitle title="Настройки" subtitle="Оформление и параметры отображения" />

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

        <Card className="p-5">
          <h2 className="mb-2 text-sm font-black">Данные браузера</h2>
          <p className="mb-4 text-xs text-muted">
            Протоколы, избранные команды и отправленные заявки хранятся в localStorage этого браузера.
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
