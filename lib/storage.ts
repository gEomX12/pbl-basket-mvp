import { notify } from '@/lib/client-store';
import { DEFAULT_PROFILE, SEED_MATCHES } from '@/lib/league-data';
import type { Account, ArchivedMatch, TeamRequest, UserProfile } from '@/types/match';

export const KEYS = {
  matches: 'pbl.matches',
  profile: 'pbl.profile',
  accounts: 'pbl.accounts',
  session: 'pbl.session',
  requests: 'pbl.requests',
  favorites: 'pbl.favorites',
  season: 'pbl.season',
  division: 'pbl.division',
  theme: 'bs-theme',
} as const;

export const ALL_KEYS = Object.values(KEYS);

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* переполненное хранилище игнорируем */
  }
  notify();
}

export function readRaw(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeRaw(key: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
  notify();
}

/* ----------------------------- Матчи ----------------------------- */

export function loadStoredMatches(): ArchivedMatch[] {
  return readJson<ArchivedMatch[]>(KEYS.matches) ?? [];
}

export function saveMatch(match: ArchivedMatch): void {
  writeJson(KEYS.matches, [match, ...loadStoredMatches().filter((item) => item.id !== match.id)]);
}

export function deleteStoredMatch(id: string): void {
  writeJson(KEYS.matches, loadStoredMatches().filter((item) => item.id !== id));
}

export function loadAllMatches(): ArchivedMatch[] {
  const stored = loadStoredMatches();
  if (stored.length === 0) return SEED_MATCHES;
  const storedIds = new Set(stored.map((match) => match.id));
  return [...stored, ...SEED_MATCHES.filter((match) => !storedIds.has(match.id))];
}

/* ---------------------------- Профиль ---------------------------- */

export function loadProfile(): UserProfile {
  return readJson<UserProfile>(KEYS.profile) ?? { ...DEFAULT_PROFILE };
}

export function saveProfile(profile: UserProfile): void {
  writeJson(KEYS.profile, profile);
}

/* -------------------------- Аккаунты ----------------------------- */

export function loadAccounts(): Account[] {
  return readJson<Account[]>(KEYS.accounts) ?? [];
}

export function saveAccounts(accounts: Account[]): void {
  writeJson(KEYS.accounts, accounts);
}

export function loadSession(): string | null {
  return readRaw(KEYS.session);
}

export function setSession(login: string | null): void {
  writeRaw(KEYS.session, login);
}

/* --------------------------- Заявки ------------------------------ */

export function loadRequests(): TeamRequest[] {
  return readJson<TeamRequest[]>(KEYS.requests) ?? [];
}

export function saveRequest(request: TeamRequest): void {
  writeJson(KEYS.requests, [request, ...loadRequests()]);
}

/* ------------------------- Избранное ----------------------------- */

export function loadFavorites(): string[] {
  return readJson<string[]>(KEYS.favorites) ?? [];
}

export function toggleFavorite(team: string): void {
  const current = loadFavorites();
  writeJson(
    KEYS.favorites,
    current.includes(team) ? current.filter((item) => item !== team) : [...current, team],
  );
}

/* --------------------------- Сброс ------------------------------- */

export function clearAll(): void {
  if (typeof window === 'undefined') return;
  for (const key of ALL_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
  notify();
}
