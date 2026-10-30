'use client';

/**
 * Черновики форм, которые пользователь заполняет в несколько шагов.
 *
 * Как и черновик матча, пишется мимо `notify()`: форму читает только она сама
 * при монтировании, будить остальных подписчиков хранилища незачем.
 */

export const DRAFT_KEYS = {
  teamRequest: 'statix_draft_team_request',
} as const;

export function loadDraft<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDraft(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function clearDraft(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
