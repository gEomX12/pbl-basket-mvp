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
  loadAllMatches,
  loadFavorites,
  readRaw,
  toggleFavorite as persistFavorite,
  writeRaw,
} from '@/lib/storage';
import type { ArchivedMatch, MatchStage } from '@/types/match';

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
/*  Избранные команды (без аккаунта — хранятся в этом браузере)        */
/* ================================================================== */

type FavoritesCtx = {
  favorites: string[];
  toggleFavorite: (team: string) => void;
};

const FavoritesContext = createContext<FavoritesCtx | null>(null);

export function useFavorites(): FavoritesCtx {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites должен вызываться внутри <AppProviders>');
  return ctx;
}

const NO_FAVORITES: string[] = [];

function FavoritesProvider({ children }: { children: ReactNode }) {
  const favorites = useClientStore('favorites', loadFavorites, NO_FAVORITES);
  const toggleFavorite = useCallback((team: string) => persistFavorite(team), []);
  const value = useMemo(() => ({ favorites, toggleFavorite }), [favorites, toggleFavorite]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

/* ================================================================== */

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <HydrationGate>
      <ThemeProvider>
        <LeagueProvider>
          <FavoritesProvider>{children}</FavoritesProvider>
        </LeagueProvider>
      </ThemeProvider>
    </HydrationGate>
  );
}
