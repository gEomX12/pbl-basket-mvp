'use client';

import { getSupabase, isSupabaseConfigured, TABLES } from '@/lib/supabase';
import type { TeamRequest } from '@/types/match';

/**
 * Заявки команд.
 *
 * Система записи — таблица `applications` в Supabase. Локальная копия в
 * localStorage нужна только для списка «мои заявки» в этом браузере:
 * читать чужие заявки с клиента нельзя, там персональные данные.
 */

export interface ApplicationInput {
  teamName: string;
  captain: string;
  phone: string;
  email: string;
  division: string;
  roster: string;
  comment: string;
}

/** Строка таблицы `applications`. */
type Row = {
  team_name: string;
  captain_name: string;
  phone: string;
  email: string;
  division: string;
  roster: string;
  comment: string;
};

const toRow = (input: ApplicationInput): Row => ({
  team_name: input.teamName.trim(),
  captain_name: input.captain.trim(),
  phone: input.phone.trim(),
  email: input.email.trim(),
  division: input.division,
  roster: input.roster.trim(),
  comment: input.comment.trim(),
});

export type SubmitResult =
  | { ok: true; stored: 'supabase' | 'local'; request: TeamRequest }
  | { ok: false; error: string };

export async function submitApplication(input: ApplicationInput): Promise<SubmitResult> {
  const request: TeamRequest = {
    id: `req-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'new',
    teamName: input.teamName.trim(),
    captain: input.captain.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    division: input.division,
    roster: input.roster.trim(),
    comment: input.comment.trim(),
  };

  const supabase = getSupabase();

  if (!supabase) {
    // Без настроенного Supabase заявка всё равно не теряется.
    return { ok: true, stored: 'local', request };
  }

  const { error } = await supabase.from(TABLES.applications).insert(toRow(input));

  if (error) {
    return {
      ok: false,
      error: `Не удалось отправить заявку: ${error.message}. Попробуйте ещё раз или напишите нам.`,
    };
  }

  return { ok: true, stored: 'supabase', request };
}

export { isSupabaseConfigured };
