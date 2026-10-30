'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { HydrationGate, useClientStore } from '@/lib/client-store';
import {
  CURRENT_DIVISION,
  CURRENT_SEASON,
  DIVISIONS,
  SEASONS,
  SEED_MATCHES,
} from '@/lib/league-data';
import {
  KEYS,
  loadAccounts,
  loadAllMatches,
  loadFavorites,
  loadSession,
  readRaw,
  saveAccounts,
  setSession,
  toggleFavorite as persistFavorite,
  writeRaw,
} from '@/lib/storage';
import type { Account, ArchivedMatch, MatchStage } from '@/types/match';

/* ================================================================== */
/*  Тема                                                               */
/* ================================================================== */

export type Theme = 'light' | 'dark';

type ThemeCtx = { theme: Theme; setTheme: (value: Theme) => void; toggle: () => void };

const ThemeContext = createContext<ThemeCtx>({
  theme: 'dark',
  setTheme: () => {},
  toggle: () => {},
});

export const useTheme = () => useContext(ThemeContext);

/** Инлайн-скрипт: ставит тему до первой отрисовки, чтобы не было вспышки. */
export const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem('bs-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';localStorage.setItem('bs-theme',t);}var r=document.documentElement;r.setAttribute('data-theme',t);r.style.colorScheme=t;}catch(e){}})();`;

function readTheme(): Theme {
  const stored = readRaw(KEYS.theme);
  if (stored === 'light' || stored === 'dark') return stored;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useClientStore<Theme>('theme', readTheme, 'dark');

  const setTheme = useCallback((value: Theme) => {
    document.documentElement.setAttribute('data-theme', value);
    document.documentElement.style.colorScheme = value;
    writeRaw(KEYS.theme, value);
  }, []);

  // Источник истины для переключения — атрибут на <html>: он всегда актуален,
  // даже если снимок стора ещё не обновился после гидратации.
  const toggle = useCallback(() => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  }, [setTheme]);

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/* ================================================================== */
/*  Лига: матчи + фильтры сезона / дивизиона / стадии                  */
/* ================================================================== */

export type StageFilter = MatchStage | 'all';

type LeagueCtx = {
  /** Все матчи всех сезонов */
  allMatches: ArchivedMatch[];
  /** Матчи выбранного сезона и дивизиона (без фильтра стадии) */
  seasonMatches: ArchivedMatch[];
  /** Матчи с учётом всех фильтров, включая стадию */
  matches: ArchivedMatch[];
  season: string;
  setSeason: (value: string) => void;
  division: string;
  setDivision: (value: string) => void;
  stage: StageFilter;
  setStage: (value: StageFilter) => void;
  seasons: readonly string[];
  divisions: readonly string[];
  refresh: () => void;
  ready: boolean;
};

const LeagueContext = createContext<LeagueCtx | null>(null);

export function useLeague(): LeagueCtx {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error('useLeague должен вызываться внутри <AppProviders>');
  return ctx;
}

function readSeason(): string {
  const stored = readRaw(KEYS.season);
  return stored && (SEASONS as readonly string[]).includes(stored) ? stored : CURRENT_SEASON;
}

function readDivision(): string {
  const stored = readRaw(KEYS.division);
  return stored && (DIVISIONS as readonly string[]).includes(stored) ? stored : CURRENT_DIVISION;
}

function LeagueProvider({ children }: { children: ReactNode }) {
  const allMatches = useClientStore('matches', loadAllMatches, SEED_MATCHES);
  const season = useClientStore('season', readSeason, CURRENT_SEASON);
  const division = useClientStore('division', readDivision, CURRENT_DIVISION);
  const [stage, setStage] = useState<StageFilter>('all');

  const setSeason = useCallback((value: string) => writeRaw(KEYS.season, value), []);
  const setDivision = useCallback((value: string) => writeRaw(KEYS.division, value), []);

  // Данные читаются синхронно из localStorage — отдельного шага загрузки нет.
  const refresh = useCallback(() => {}, []);

  const seasonMatches = useMemo(
    () =>
      allMatches
        .filter((match) => match.season === season && match.division === division)
        .sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time)),
    [allMatches, season, division],
  );

  const matches = useMemo(
    () => (stage === 'all' ? seasonMatches : seasonMatches.filter((m) => m.stage === stage)),
    [seasonMatches, stage],
  );

  const value = useMemo<LeagueCtx>(
    () => ({
      allMatches,
      seasonMatches,
      matches,
      season,
      setSeason,
      division,
      setDivision,
      stage,
      setStage,
      seasons: SEASONS,
      divisions: DIVISIONS,
      refresh,
      ready: true,
    }),
    [allMatches, seasonMatches, matches, season, setSeason, division, setDivision, stage, refresh],
  );

  return <LeagueContext.Provider value={value}>{children}</LeagueContext.Provider>;
}

/* ================================================================== */
/*  Аккаунт                                                            */
/* ================================================================== */

type AuthResult = { ok: boolean; error?: string };

type AuthCtx = {
  account: Account | null;
  ready: boolean;
  signIn: (login: string, password: string) => AuthResult;
  signUp: (input: Omit<Account, 'createdAt'>) => AuthResult;
  signOut: () => void;
  update: (patch: Partial<Account>) => void;
  accounts: Account[];
  favorites: string[];
  toggleFavorite: (team: string) => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth должен вызываться внутри <AppProviders>');
  return ctx;
}

const NO_ACCOUNTS: Account[] = [];
const NO_FAVORITES: string[] = [];

function AuthProvider({ children }: { children: ReactNode }) {
  const accounts = useClientStore('accounts', loadAccounts, NO_ACCOUNTS);
  const login = useClientStore<string | null>('session', loadSession, null);
  const favorites = useClientStore('favorites', loadFavorites, NO_FAVORITES);

  const account = useMemo(
    () => accounts.find((item) => item.login === login) ?? null,
    [accounts, login],
  );

  const signIn = useCallback<AuthCtx['signIn']>((value, password) => {
    const found = loadAccounts().find(
      (item) => item.login.toLowerCase() === value.trim().toLowerCase(),
    );
    if (!found) return { ok: false, error: 'Пользователь не найден' };
    if (found.password !== password) return { ok: false, error: 'Неверный пароль' };
    setSession(found.login);
    return { ok: true };
  }, []);

  const signUp = useCallback<AuthCtx['signUp']>((input) => {
    const list = loadAccounts();
    if (list.some((item) => item.login.toLowerCase() === input.login.trim().toLowerCase())) {
      return { ok: false, error: 'Такой логин уже занят' };
    }
    const created: Account = {
      ...input,
      login: input.login.trim(),
      createdAt: new Date().toISOString(),
    };
    saveAccounts([...list, created]);
    setSession(created.login);
    return { ok: true };
  }, []);

  const signOut = useCallback(() => setSession(null), []);

  const update = useCallback<AuthCtx['update']>(
    (patch) => {
      if (!login) return;
      saveAccounts(
        loadAccounts().map((item) => (item.login === login ? { ...item, ...patch } : item)),
      );
    },
    [login],
  );

  const toggleFavorite = useCallback((team: string) => persistFavorite(team), []);

  const value = useMemo<AuthCtx>(
    () => ({
      account,
      ready: true,
      signIn,
      signUp,
      signOut,
      update,
      accounts,
      favorites,
      toggleFavorite,
    }),
    [account, signIn, signUp, signOut, update, accounts, favorites, toggleFavorite],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ================================================================== */

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <HydrationGate>
      <ThemeProvider>
        <LeagueProvider>
          <AuthProvider>{children}</AuthProvider>
        </LeagueProvider>
      </ThemeProvider>
    </HydrationGate>
  );
}
