'use client';

import type { MatchStage, TeamState } from '@/types/match';

/**
 * Черновик активного матча судейского столика.
 *
 * Пишется напрямую в localStorage, **минуя** `notify()` из client-store:
 * во время игры состояние меняется раз в секунду, и будить всех подписчиков
 * хранилища на каждый тик было бы дорого. Читает черновик только столик и
 * только при монтировании.
 */

export const MATCH_SESSION_KEY = 'statix_active_match_session';

const VERSION = 1;

export type Side = 'home' | 'away';

export interface MatchSetupDraft {
  homeName: string;
  awayName: string;
  venue: string;
  stage: MatchStage;
  date: string;
  time: string;
}

export interface MatchDeskDraft {
  sessionId: string;
  home: TeamState;
  away: TeamState;
  onCourt: Record<Side, string[]>;
  quarter: number;
  timeLeft: number;
  possession: Side | null;
  selectedId: string | null;
  history: string[];
}

export interface MatchSession {
  version: number;
  savedAt: string;
  setup: MatchSetupDraft;
  /** `null` — матч ещё не начат, сохранены только настройки */
  desk: MatchDeskDraft | null;
}

function looksLikeTeam(value: unknown): value is TeamState {
  if (!value || typeof value !== 'object') return false;
  const team = value as Partial<TeamState>;
  return (
    typeof team.name === 'string' &&
    typeof team.score === 'number' &&
    Array.isArray(team.players) &&
    Array.isArray(team.quarters)
  );
}

/** Повреждённый черновик не должен ронять столик — возвращаем `null`. */
function parse(raw: string): MatchSession | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!data || typeof data !== 'object') return null;
  const session = data as Partial<MatchSession>;
  if (session.version !== VERSION) return null;

  const setup = session.setup;
  if (!setup || typeof setup.homeName !== 'string' || typeof setup.awayName !== 'string') {
    return null;
  }

  const desk = session.desk;
  if (desk) {
    if (
      typeof desk.sessionId !== 'string' ||
      !looksLikeTeam(desk.home) ||
      !looksLikeTeam(desk.away) ||
      typeof desk.quarter !== 'number' ||
      typeof desk.timeLeft !== 'number'
    ) {
      return null;
    }
  }

  return {
    version: VERSION,
    savedAt: typeof session.savedAt === 'string' ? session.savedAt : '',
    setup: {
      homeName: setup.homeName,
      awayName: setup.awayName,
      venue: typeof setup.venue === 'string' ? setup.venue : '',
      stage: (setup.stage ?? 'regular') as MatchStage,
      date: typeof setup.date === 'string' ? setup.date : '',
      time: typeof setup.time === 'string' ? setup.time : '19:00',
    },
    desk: desk ?? null,
  };
}

export function loadMatchSession(): MatchSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(MATCH_SESSION_KEY);
    return raw ? parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveMatchSession(session: Omit<MatchSession, 'version' | 'savedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      MATCH_SESSION_KEY,
      JSON.stringify({ ...session, version: VERSION, savedAt: new Date().toISOString() }),
    );
  } catch {
    /* переполненное хранилище игнорируем — матч важнее черновика */
  }
}

export function clearMatchSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(MATCH_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
