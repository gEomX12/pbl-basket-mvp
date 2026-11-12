'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import {
  DEMO_JUDGE,
  judgeAuthMode,
  signInJudge,
  signOutJudge,
  useJudge,
} from '@/lib/judge-auth';
import { Card, RouteFallback, SectionTitle, btn, inputClass, labelClass } from '@/components/ui';

/** Вход только для судей: открывает доступ к судейскому столику. */
export default function LoginPage() {
  const router = useRouter();
  const judge = useJudge();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (judge.status === 'loading') return <RouteFallback />;

  if (judge.status === 'signed-in') {
    return (
      <section className="mx-auto max-w-md">
        <SectionTitle title="Вы вошли как судья" subtitle={judge.judge.name} />
        <Card className="space-y-3 p-5">
          <p className="text-sm text-muted">
            E-mail <b className="text-fg">{judge.judge.email}</b>
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/scorer" className={btn.primary}>Открыть судейский столик</Link>
            <button type="button" onClick={() => void signOutJudge()} className={btn.ghost}>
              Выйти
            </button>
          </div>
        </Card>
      </section>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    setError('');
    if (!email.trim() || !password) {
      setError('Введите e-mail и пароль');
      return;
    }
    setSending(true);
    const result = await signInJudge(email, password);
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push('/scorer');
  };

  return (
    <section className="mx-auto max-w-md">
      <SectionTitle
        title="Вход для судей"
        subtitle="Доступ к судейскому столику. Аккаунты судьям выдаёт администратор лиги."
      />

      <form onSubmit={submit} noValidate>
        <Card className="space-y-4 p-5">
          <label className="block space-y-1.5">
            <span className={labelClass}>E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              autoComplete="username"
              inputMode="email"
              placeholder="judge@example.com"
            />
          </label>

          <label className="block space-y-1.5">
            <span className={labelClass}>Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
              autoComplete="current-password"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-loss/10 px-3 py-2 text-xs font-bold text-loss">{error}</p>
          )}

          <button type="submit" disabled={sending} className={`${btn.primary} w-full`}>
            {sending ? 'Входим…' : 'Войти'}
          </button>

          {judgeAuthMode === 'demo' && (
            <p className="rounded-lg bg-surface2 px-3 py-2 text-[11px] text-muted">
              Режим разработки без Supabase: демо-вход{' '}
              <b className="text-fg">{DEMO_JUDGE.email}</b> / <b className="text-fg">{DEMO_JUDGE.password}</b>
            </p>
          )}
        </Card>
      </form>

      <p className="mt-6 text-center text-xs text-muted">
        Хотите заявить команду? Регистрация не нужна —{' '}
        <Link href="/#request" className="font-bold text-accent">заполните заявку на главной</Link>.
      </p>
    </section>
  );
}
