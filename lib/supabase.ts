import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Клиент Supabase — опциональная зависимость.
 *
 * Если переменные окружения не заданы, приложение полностью работает на
 * localStorage: все вызовы ниже возвращают `null`, а вызывающий код просто
 * не уходит в сеть. Это нужно, чтобы демонстрация не падала без бэкенда.
 *
 * Для включения создайте `.env.local`:
 *   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
 */

// Обращения к process.env.NEXT_PUBLIC_* должны быть статическими:
// Next подставляет значения на этапе сборки.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 0;

let cached: SupabaseClient | null = null;

/** Возвращает клиент или `null`, если Supabase не сконфигурирован. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!cached) {
    cached = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return cached;
}

/** Таблицы, с которыми работает приложение. */
export const TABLES = {
  liveEvents: 'live_events',
  applications: 'applications',
} as const;
