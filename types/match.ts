export interface Player {
  id: string;
  number: number;
  name: string;
  fouls: number;
  points: number;
  ast: number;
  reb_off: number;
  reb_def: number;
  stl: number;
  blk: number;
  to: number;
  fg_made: number;
  fg_att: number;
  fg3_made: number;
  fg3_att: number;
  ft_made: number;
  ft_att: number;
  seconds: number;
}

export interface MatchLog {
  id: string;
  timestamp: string;
  quarter: number;
  team: 'home' | 'away' | 'system';
  message: string;
}

export interface TeamState {
  name: string;
  score: number;
  fouls: number;
  timeouts: number;
  players: Player[];
  /** Очки по четвертям: [Q1, Q2, Q3, Q4, ...OT] */
  quarters: number[];
}

export type MatchStatus = 'final' | 'live' | 'scheduled';

/** Стадия турнира — соответствует фильтрам «Регулярка / Плей-офф / Товарищеский» */
export type MatchStage = 'regular' | 'playoff' | 'friendly';

export interface ArchivedMatch {
  id: string;
  /** ISO-дата YYYY-MM-DD */
  date: string;
  /** Время начала HH:MM */
  time: string;
  venue: string;
  status: MatchStatus;
  stage: MatchStage;
  season: string;
  division: string;
  /** Для live-матчей: текущая четверть и часы */
  period?: number;
  clock?: string;
  /** Ссылка на видеообзор */
  video?: string;
  home: TeamState;
  away: TeamState;
}

export type ProfileRole = 'scorer' | 'coach' | 'fan';

export interface UserProfile {
  displayName: string;
  role: ProfileRole;
  club: string;
}

export interface Account {
  login: string;
  password: string;
  displayName: string;
  role: ProfileRole;
  club: string;
  favoriteTeam: string;
  createdAt: string;
}

export interface TeamRequest {
  id: string;
  createdAt: string;
  teamName: string;
  captain: string;
  phone: string;
  email: string;
  division: string;
  roster: string;
  comment: string;
  status: 'new' | 'accepted';
}

export interface LeagueLeader {
  key: string;
  name: string;
  team: string;
  games: number;
  points: number;
  ast: number;
  reb: number;
  ppg: number;
  apg: number;
  rpg: number;
}

export type ScoringPoints = 1 | 2 | 3;

export type BoxStatAction =
  | 'ast'
  | 'reb_off'
  | 'reb_def'
  | 'stl'
  | 'blk'
  | 'to';


/* ------------------------------------------------------------------ */
/*  Живой протокол (play-by-play)                                       */
/* ------------------------------------------------------------------ */

export type LiveEventKind =
  | 'score'
  | 'miss'
  | 'foul'
  | 'timeout'
  | 'sub'
  | 'stat'
  | 'period'
  | 'system';

export interface LiveEvent {
  id: string;
  matchId: string;
  /** ISO-время записи — порядок внутри одинакового таймкода */
  createdAt: string;
  period: number;
  /** Игровое время MM:SS на момент события */
  clock: string;
  side: 'home' | 'away' | 'system';
  team: string;
  kind: LiveEventKind;
  points?: number;
  playerName?: string;
  playerNumber?: number;
  text: string;
}
