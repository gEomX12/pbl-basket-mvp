'use client';

import { useState, type FormEvent } from 'react';
import { useLeague } from '@/lib/providers';
import { useClientStore } from '@/lib/client-store';
import { loadRequests, saveRequest } from '@/lib/storage';
import { submitApplication } from '@/lib/applications';
import { isSupabaseConfigured } from '@/lib/supabase';
import { fmtDate } from '@/lib/format';
import { CONTACT_EMAIL, CONTACT_TELEGRAM, CONTACT_TELEGRAM_URL } from '@/components/Footer';
import Toast, { type ToastTone } from '@/components/Toast';
import { Card, SectionTitle, btn, inputClass, labelClass } from '@/components/ui';
import type { TeamRequest } from '@/types/match';

type Form = Omit<TeamRequest, 'id' | 'createdAt' | 'status'>;

const EMPTY: Form = {
  teamName: '',
  captain: '',
  phone: '',
  email: '',
  division: '',
  roster: '',
  comment: '',
};

/** Готовый набор для демонстрации — заполняет форму в один клик. */
const DEMO: Omit<Form, 'division'> = {
  teamName: 'Ertys Warriors',
  captain: 'Асылбек Жумагулов',
  phone: '+7 701 345 67 89',
  email: 'ertys.warriors@gmail.com',
  roster: [
    'Жумагулов Асылбек, 7, разыгрывающий',
    'Ковалёв Денис, 10, атакующий защитник',
    'Темирбаев Санжар, 14, лёгкий форвард',
    'Шмидт Виктор, 23, тяжёлый форвард',
    'Оспанов Ержан, 32, центровой',
    'Калиев Мирас, 5, защитник',
    'Лаптев Григорий, 8, форвард',
    'Нурпеисов Диас, 11, защитник',
    'Беляев Станислав, 21, центровой',
    'Садвакасов Алишер, 44, форвард',
  ].join('\n'),
  comment: 'Играем с 2021 года, свой зал в Павлодаре. Удобные дни — суббота и воскресенье.',
};

const NO_REQUESTS: TeamRequest[] = [];

export default function RequestPage() {
  const { divisions } = useLeague();
  const [form, setForm] = useState<Form>({ ...EMPTY, division: divisions[0] });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: ToastTone } | null>(null);
  const history = useClientStore('requests', loadRequests, NO_REQUESTS);

  const showToast = (text: string, tone: ToastTone) => {
    setToast({ text, tone });
    window.setTimeout(() => setToast(null), tone === 'success' ? 6000 : 9000);
  };

  const set = <K extends keyof Form>(field: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof Form, string>> = {};
    if (form.teamName.trim().length < 2) next.teamName = 'Укажите название команды';
    if (form.captain.trim().length < 2) next.captain = 'Укажите имя капитана';
    if (!/^[+\d][\d\s()-]{6,}$/.test(form.phone.trim())) next.phone = 'Телефон в формате +7 777 123 45 67';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) next.email = 'Некорректный e-mail';
    const players = form.roster.split('\n').map((line) => line.trim()).filter(Boolean);
    if (players.length < 5) next.roster = 'Нужно минимум 5 игроков — по одному в строке';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending || !validate()) return;

    setSending(true);
    const result = await submitApplication(form);
    setSending(false);

    if (!result.ok) {
      showToast(result.error, 'error');
      return;
    }

    // Локальная копия нужна только для списка «мои заявки» в этом браузере.
    saveRequest(result.request);
    setForm({ ...EMPTY, division: divisions[0] });
    setErrors({});
    showToast(
      result.stored === 'supabase'
        ? 'Заявка успешно отправлена! Администратор PBL свяжется с вами.'
        : 'Заявка сохранена локально: Supabase не настроен. Администратор PBL свяжется с вами.',
      'success',
    );
  };

  const fillDemo = () => {
    setForm({ ...DEMO, division: divisions[0] });
    setErrors({});
    showToast('Форма заполнена демонстрационными данными.', 'success');
  };

  const rosterCount = form.roster.split('\n').filter((line) => line.trim()).length;

  return (
    <section className="mx-auto max-w-3xl">
      <SectionTitle
        title="Подать заявку"
        subtitle="Заявка на участие команды в Павлодарской баскетбольной лиге"
        action={
          <button type="button" onClick={fillDemo} className={btn.primary}>
            ⚡ Заполнить демо-данными
          </button>
        }
      />

      <form onSubmit={submit} noValidate>
        <Card className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className={labelClass}>Название команды *</span>
              <input
                value={form.teamName}
                onChange={(event) => set('teamName', event.target.value)}
                className={inputClass}
                placeholder="Например, Ertys Warriors"
              />
              {errors.teamName && <span className="block text-[11px] text-loss">{errors.teamName}</span>}
            </label>

            <label className="block space-y-1.5">
              <span className={labelClass}>Капитан *</span>
              <input
                value={form.captain}
                onChange={(event) => set('captain', event.target.value)}
                className={inputClass}
                placeholder="Фамилия и имя"
              />
              {errors.captain && <span className="block text-[11px] text-loss">{errors.captain}</span>}
            </label>

            <label className="block space-y-1.5">
              <span className={labelClass}>Телефон *</span>
              <input
                value={form.phone}
                onChange={(event) => set('phone', event.target.value)}
                className={inputClass}
                placeholder="+7 777 123 45 67"
                inputMode="tel"
              />
              {errors.phone && <span className="block text-[11px] text-loss">{errors.phone}</span>}
            </label>

            <label className="block space-y-1.5">
              <span className={labelClass}>E-mail *</span>
              <input
                value={form.email}
                onChange={(event) => set('email', event.target.value)}
                className={inputClass}
                placeholder="team@mail.kz"
                inputMode="email"
              />
              {errors.email && <span className="block text-[11px] text-loss">{errors.email}</span>}
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className={labelClass}>Дивизион</span>
            <select
              value={form.division}
              onChange={(event) => set('division', event.target.value)}
              className={inputClass}
            >
              {divisions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className={labelClass}>Состав — по одному игроку в строке * ({rosterCount})</span>
            <textarea
              value={form.roster}
              onChange={(event) => set('roster', event.target.value)}
              rows={8}
              className={`${inputClass} resize-y font-mono text-xs`}
              placeholder={'Жумагулов Асылбек, 7, разыгрывающий\nКовалёв Денис, 10, защитник\n…'}
            />
            {errors.roster && <span className="block text-[11px] text-loss">{errors.roster}</span>}
          </label>

          <label className="block space-y-1.5">
            <span className={labelClass}>Комментарий</span>
            <textarea
              value={form.comment}
              onChange={(event) => set('comment', event.target.value)}
              rows={3}
              className={`${inputClass} resize-y`}
              placeholder="Удобные дни для игр, форма, спонсоры…"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={sending} className={btn.primary}>
              {sending ? 'Отправляем…' : 'Отправить заявку'}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm({ ...EMPTY, division: divisions[0] });
                setErrors({});
              }}
              className={btn.ghost}
            >
              Очистить
            </button>
            <a
              href={CONTACT_TELEGRAM_URL}
              target="_blank"
              rel="noreferrer noopener"
              className={btn.ghost}
            >
              Связаться — @{CONTACT_TELEGRAM}
            </a>
          </div>

          <p className="text-[11px] text-muted">
            Отправляя заявку, вы соглашаетесь с регламентом лиги.{' '}
            {isSupabaseConfigured
              ? 'Заявка уходит администраторам лиги.'
              : 'Supabase не настроен — заявка сохранится только в этом браузере.'}
          </p>
        </Card>
      </form>

      {history.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-black">Мои заявки</h2>
          <p className="mb-3 text-xs text-muted">
            Список заявок, отправленных из этого браузера.
          </p>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {history.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold">{item.teamName}</span>
                    <span className="rounded-md bg-accentsoft px-2 py-0.5 text-[11px] font-bold text-accent">
                      {item.status === 'new' ? 'На рассмотрении' : 'Принята'}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    {item.division} · капитан {item.captain} · {item.phone} · {item.email} ·
                    отправлена {fmtDate(item.createdAt.slice(0, 10))}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      <p className="mt-6 text-center text-xs text-muted">
        Вопросы по участию — Telegram{' '}
        <a href={CONTACT_TELEGRAM_URL} target="_blank" rel="noreferrer noopener" className="font-bold text-accent">
          @{CONTACT_TELEGRAM}
        </a>{' '}
        или почта{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-accent">
          {CONTACT_EMAIL}
        </a>
      </p>

      <Toast text={toast?.text ?? null} tone={toast?.tone} onClose={() => setToast(null)} />
    </section>
  );
}
