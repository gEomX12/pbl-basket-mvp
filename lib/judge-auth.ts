'use client';

import { useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useHydrated } from '@/lib/client-store';
import { TABLES, getSupabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Авторизация судей — единственный вид входа на сайте.
 *
 * Аккаунт нужен только для судейского столика. Болельщикам и капитанам
 * регистрироваться не нужно: таблица, статистика и форма заявки открыты.
 *
 * Режимы:
 * - `supabase` — Supabase Auth (e-mail + пароль). Судью создаёт администратор
 *   в панели Supabase и добавляет его `user_id` в таблицу `judges`.
 *   Пользователь без строки в `judges` к столику не допускается — даже если
 *   смог зарегистрироваться через anon-ключ.
 * - `demo` — Supabase не настроен и идёт локальная разработка: вход по
 *   демо-учётке `DEMO_JUDGE`, сессия в localStorage.
 * - `disabled` — Supabase не настроен в продакшене: войти нельзя.
 */

export type JudgeAuthMode = 'supabase' | 'demo' | 'disabled';

export const judgeAuthMode: JudgeAuthMode = isSupabaseConfigured
  ? 'supabase'
  : process.env.NODE_ENV === 'development'
    ? 'demo'
    : 'disabled';

export const DEMO_JUDGE = { email: 'judge@pbl.local', password: 'judge', name: 'Демо-судья' };

export type Judge = { id: string; email: string; name: string };

export type JudgeState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; judge: Judge };

const LOADING: JudgeState = { status: 'loading' };
const SIGNED_OUT: JudgeState = { status: 'signed-out' };

const DEMO_SESSION_KEY = 'pbl.judge-demo';
/** Имя судьи — чтобы показать его, если проверка прав не удалась из-за сети. */
const NAME_CACHE_KEY = 'pbl.judge-name';

/* ------------------------------------------------------------------ */
/*  Хранилище состояния                                                 */
/* ------------------------------------------------------------------ */

let state: JudgeState = LOADING;
let started = false;
const listeners = new Set<() => void>();

function setState(next: JudgeState): void {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
  };
}

function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

type Verdict = { state: JudgeState; error?: string };

/** Проверяет, что пользователь сессии внесён в таблицу судей. */
async function verify(session: Session | null): Promise<Verdict> {
  const supabase = getSupabase();
  if (!supabase || !session) return { state: SIGNED_OUT };

  const { user } = session;
  const email = user.email ?? '';
  const { data, error } = await supabase
    .from(TABLES.judges)
    .select('name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    // Сеть пропала посреди матча — не выкидываем судью со столика:
    // сессия подписана Supabase, а запись в базу всё равно проверит RLS.
    const cached = readLocal(NAME_CACHE_KEY);
    return { state: { status: 'signed-in', judge: { id: user.id, email, name: cached || email } } };
  }

  if (!data) {
    return {
      state: SIGNED_OUT,
      error: 'У этого аккаунта нет доступа к судейскому столику. Обратитесь к администратору лиги.',
    };
  }

  const name = (data as { name: string | null }).name?.trim() || email;
  writeLocal(NAME_CACHE_KEY, name);
  return { state: { status: 'signed-in', judge: { id: user.id, email, name } } };
}

function start(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  if (judgeAuthMode === 'demo') {
    setState(
      readLocal(DEMO_SESSION_KEY)
        ? { status: 'signed-in', judge: { id: 'demo', email: DEMO_JUDGE.email, name: DEMO_JUDGE.name } }
        : SIGNED_OUT,
    );
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    setState(SIGNED_OUT);
    return;
  }

  // INITIAL_SESSION приходит сразу после подписки — отдельный getSession() не нужен.
  supabase.auth.onAuthStateChange((_event, session) => {
    // Обращаться к Supabase внутри колбэка нельзя (взаимная блокировка) — откладываем.
    window.setTimeout(() => {
      if (!session) {
        setState(SIGNED_OUT);
        return;
      }
      // Обновление токена того же судьи — перепроверять незачем.
      if (state.status === 'signed-in' && state.judge.id === session.user.id) return;
      void verify(session).then((verdict) => {
        setState(verdict.state);
        if (verdict.state.status === 'signed-out') void supabase.auth.signOut();
      });
    }, 0);
  });
}

/* ------------------------------------------------------------------ */
/*  Публичное API                                                       */
/* ------------------------------------------------------------------ */

/**
 * Текущий судья. До конца гидратации всегда `loading` — так разметка
 * совпадает с серверной.
 */
export function useJudge(): JudgeState {
  const hydrated = useHydrated();
  const value = useSyncExternalStore(subscribe, () => state, () => LOADING);
  return hydrated ? value : LOADING;
}

export type SignInResult = { ok: true } | { ok: false; error: string };

export async function signInJudge(email: string, password: string): Promise<SignInResult> {
  const login = email.trim().toLowerCase();

  if (judgeAuthMode === 'disabled') {
    return {
      ok: false,
      error:
        'Supabase не подключён: при сборке не заданы NEXT_PUBLIC_SUPABASE_URL и ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY. Добавьте их в окружение хостинга и пересоберите сайт.',
    };
  }

  if (judgeAuthMode === 'demo') {
    if (login !== DEMO_JUDGE.email || password !== DEMO_JUDGE.password) {
      return { ok: false, error: 'Неверный e-mail или пароль' };
    }
    writeLocal(DEMO_SESSION_KEY, '1');
    setState({ status: 'signed-in', judge: { id: 'demo', email: DEMO_JUDGE.email, name: DEMO_JUDGE.name } });
    return { ok: true };
  }

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase не настроен' };

  const { data, error } = await supabase.auth.signInWithPassword({ email: login, password });
  if (error) {
    const invalid = /invalid login credentials/i.test(error.message);
    return {
      ok: false,
      error: invalid ? 'Неверный e-mail или пароль' : `Не удалось войти: ${error.message}`,
    };
  }

  const verdict = await verify(data.session);
  if (verdict.state.status !== 'signed-in') {
    await supabase.auth.signOut();
    setState(SIGNED_OUT);
    return { ok: false, error: verdict.error ?? 'Нет доступа к судейскому столику' };
  }

  setState(verdict.state);
  return { ok: true };
}

export async function signOutJudge(): Promise<void> {
  writeLocal(NAME_CACHE_KEY, null);
  if (judgeAuthMode === 'demo') {
    writeLocal(DEMO_SESSION_KEY, null);
  } else {
    await getSupabase()?.auth.signOut();
  }
  setState(SIGNED_OUT);
}
