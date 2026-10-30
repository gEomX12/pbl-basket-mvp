import type { ArchivedMatch, MatchStage, Player, TeamState } from '@/types/match';

/* ------------------------------------------------------------------ */
/*  Справочники лиги                                                    */
/*                                                                      */
/*  Команды, тренеры, составы и матчи стартового тура — реальные данные */
/*  ПБЛ Павлодар, сезон 2026/27, дивизион A (9 команд, 122 игроков).   */
/*  Счёт и статистика сыгранных матчей генерируются детерминированно:   */
/*  официальный сезон стартует 2026-11-01, сыгранных игр пока нет.      */
/* ------------------------------------------------------------------ */

export const SEASONS = ['2026/27'] as const;
export const CURRENT_SEASON = SEASONS[0];

export const DIVISIONS = ['Дивизион A'] as const;
export const CURRENT_DIVISION = DIVISIONS[0];

/** Дата официального старта сезона: до неё результаты демонстрационные. */
export const SEASON_OPENING = "2026-11-01";

export const STAGES: { value: MatchStage; label: string }[] = [
  { value: 'regular', label: 'Регулярка' },
  { value: 'playoff', label: 'Плей-офф' },
  { value: 'friendly', label: 'Товарищеский матч' },
];

export interface TeamInfo {
  id: number;
  name: string;
  short: string;
  division: string;
  color: string;
  logo: string;
  arena: string;
  coach: string;
  assistant: string;
}

export const TEAMS: TeamInfo[] = [
  { id: 827, name: "Алюминий Казахстана", short: "АоК", division: DIVISIONS[0],
    color: "#1d4ed8", logo: '/teams/827.webp', arena: "АксЗФ (г. Аксу, улица Аксу, 1/3)",
    coach: "Чуженьков Дмитрий Анатольевич", assistant: "Зайцев Евгений Евгеньевич" },
  { id: 829, name: "БК ВОЛНА", short: "ВОЛНА", division: DIVISIONS[0],
    color: "#00dcda", logo: '/teams/829.webp', arena: "АксЗФ (г. Аксу, улица Аксу, 1/3)",
    coach: "Васильев Владимир Васильевич", assistant: "" },
  { id: 825, name: "STEEL HIPPOS", short: "STHPS", division: DIVISIONS[0],
    color: "#00ff00", logo: '/teams/825.webp', arena: "АксЗФ (г. Аксу, улица Аксу, 1/3)",
    coach: "Сыздыков Жанат", assistant: "Засько Александр" },
  { id: 828, name: "City Builders", short: "CB", division: DIVISIONS[0],
    color: "#a16207", logo: '/teams/828.webp', arena: "АксЗФ (г. Аксу, улица Аксу, 1/3)",
    coach: "", assistant: "" },
  { id: 830, name: "_SHARKS_", short: "SHA", division: DIVISIONS[0],
    color: "#011d57", logo: '/teams/830.webp', arena: "АксЗФ (г. Аксу, улица Аксу, 1/3)",
    coach: "Степанова Надежда Михайловна", assistant: "" },
  { id: 831, name: "2bas team", short: "2bas", division: DIVISIONS[0],
    color: "#334155", logo: '/teams/831.webp', arena: "АксЗФ (г. Аксу, улица Аксу, 1/3)",
    coach: "Гейнц Артур Станиславович", assistant: "Голиков Александр Алексеевич" },
  { id: 824, name: "Мұнайшы", short: "ПМХЗ", division: DIVISIONS[0],
    color: "#1c19a9", logo: '/teams/824.webp', arena: "АксЗФ (г. Аксу, улица Аксу, 1/3)",
    coach: "Галимов Рустам", assistant: "" },
  { id: 832, name: "Успенка", short: "Успен", division: DIVISIONS[0],
    color: "#c2410c", logo: '/teams/832.webp', arena: "АксЗФ (г. Аксу, улица Аксу, 1/3)",
    coach: "Сагайдак Максим Борисович", assistant: "Нурманов Диас Бауыржанович" },
  { id: 833, name: "TRIX Barystar", short: "TRIX", division: DIVISIONS[0],
    color: "#334155", logo: '/teams/833.webp', arena: "АксЗФ (г. Аксу, улица Аксу, 1/3)",
    coach: "Игошин Виталий Владимирович", assistant: "" },
];

export const teamInfo = (name: string): TeamInfo | undefined =>
  TEAMS.find((team) => team.name === name);

export interface RosterEntry {
  name: string;
  /** Игровой номер; -1 — не указан в заявке */
  number: number;
  position: string;
  /** Год рождения; 0 — не указан */
  born: number;
}

/** Заявочные составы команд. */
const ROSTERS: Record<string, RosterEntry[]> = {
  "Алюминий Казахстана": [
    { name: "Артюшенко Владислав", number: -1, position: "Защитник", born: 2007 },
    { name: "Аубакиров Таир", number: -1, position: "Защитник", born: 1999 },
    { name: "Ахметов Рахим", number: -1, position: "Защитник", born: 2001 },
    { name: "Ахметов Юсим", number: -1, position: "Форвард", born: 2001 },
    { name: "Балтабаев Коблан", number: -1, position: "Защитник", born: 1998 },
    { name: "Бериков Марлен", number: -1, position: "Форвард", born: 2002 },
    { name: "Бутяев Станислав", number: -1, position: "Защитник", born: 1986 },
    { name: "Зайцев Евгений", number: -1, position: "Форвард", born: 1997 },
    { name: "Зейнолла Акылбек", number: -1, position: "Защитник", born: 2004 },
    { name: "Каукенов Арман", number: -1, position: "Защитник", born: 1987 },
    { name: "Носков Артем", number: -1, position: "Центровой", born: 1992 },
    { name: "Правдивец Максим", number: -1, position: "Форвард", born: 1986 },
    { name: "Самигуллин Ренат", number: -1, position: "Центровой", born: 1987 },
    { name: "Цитцер Иван", number: -1, position: "Форвард", born: 1991 },
    { name: "Чуженьков Дмитрий", number: -1, position: "Форвард", born: 1980 },
  ],
  "БК ВОЛНА": [
    { name: "Толмачев Тимофей", number: 1, position: "Форвард", born: 2009 },
    { name: "Онищенко Илья", number: 3, position: "Центровой", born: 2006 },
    { name: "Рзаев Тимур", number: 6, position: "Форвард", born: 2009 },
    { name: "Москвин Владислав", number: 7, position: "Форвард", born: 2009 },
    { name: "Орлов Кирилл", number: 14, position: "Защитник", born: 2008 },
    { name: "Зинченко Никита", number: 26, position: "Защитник", born: 2008 },
    { name: "Суппер Никита", number: 31, position: "Форвард", born: 2009 },
    { name: "Барышев Андрей", number: 40, position: "Форвард", born: 2008 },
    { name: "Васильев Владимир", number: 44, position: "Защитник", born: 1987 },
    { name: "Альберти Артур", number: 55, position: "Защитник", born: 2009 },
    { name: "Барышев Алексей", number: 66, position: "Центровой", born: 2008 },
    { name: "Торопчанин Никита", number: 77, position: "Защитник", born: 2008 },
    { name: "Исламов Глеб", number: 87, position: "Защитник", born: 2008 },
    { name: "Губа Юрий", number: 98, position: "Защитник", born: 2010 },
    { name: "Герасименко Максим", number: 99, position: "Форвард", born: 2009 },
  ],
  "STEEL HIPPOS": [
    { name: "Закирьянов Мейрам", number: 1, position: "Форвард", born: 1991 },
    { name: "Сыздыков Жанат", number: 3, position: "Защитник", born: 1992 },
    { name: "Максименко Владислав", number: 4, position: "Защитник", born: 1996 },
    { name: "Тулебаев Алихан", number: 5, position: "Защитник", born: 1994 },
    { name: "Толпенко Максим", number: 7, position: "Форвард", born: 2006 },
    { name: "Зауэр Артур", number: 11, position: "Защитник", born: 1998 },
    { name: "Георгиев Кирилл", number: 12, position: "Защитник", born: 1991 },
    { name: "Засько Александр", number: 23, position: "Форвард", born: 1994 },
    { name: "Сембаев Батырхан", number: 28, position: "Защитник", born: 2008 },
    { name: "Елимесов Ислам", number: 92, position: "Центровой", born: 2002 },
  ],
  "City Builders": [
    { name: "Багров Вадим", number: 5, position: "Форвард", born: 2000 },
    { name: "Гергерт Теодор", number: 8, position: "Центровой", born: 1999 },
    { name: "Измайлов Руслан", number: 10, position: "Форвард", born: 1999 },
    { name: "Романенко Антон", number: 12, position: "Защитник", born: 2007 },
    { name: "Кошкарбаев Тимур", number: 17, position: "Форвард", born: 2007 },
    { name: "Приходченко Виталий", number: 31, position: "Центровой", born: 1998 },
    { name: "Сидоренко Илья", number: 44, position: "Форвард", born: 1998 },
    { name: "Вышарь Максим", number: 63, position: "Защитник", born: 1990 },
    { name: "Брюховец Павел", number: 66, position: "Форвард", born: 2001 },
    { name: "Орел Данил", number: 88, position: "Защитник", born: 1999 },
    { name: "Гергерт Николай", number: 99, position: "Защитник", born: 1990 },
  ],
  "_SHARKS_": [
    { name: "Пономарев Вадим", number: 1, position: "Центровой", born: 2004 },
    { name: "Яковенко Роман", number: 2, position: "Форвард", born: 2007 },
    { name: "Зазыбин Александр", number: 3, position: "Защитник", born: 2008 },
    { name: "Малыгин Артём", number: 5, position: "Защитник", born: 2005 },
    { name: "Ланг Кирилл", number: 7, position: "Форвард", born: 2007 },
    { name: "Кенжетай Сағат", number: 8, position: "Защитник", born: 1998 },
    { name: "Ромазанов Рустам", number: 9, position: "Центровой", born: 2006 },
    { name: "Якубов Ренат", number: 10, position: "Форвард", born: 1995 },
    { name: "Фатхиев Амир", number: 11, position: "Центровой", born: 2007 },
    { name: "Сайфулов Тахир", number: 13, position: "Центровой", born: 2007 },
    { name: "Жұмағұл Батырхан", number: 67, position: "Форвард", born: 2006 },
    { name: "Рушанов Ералы", number: 99, position: "Форвард", born: 2007 },
  ],
  "2bas team": [
    { name: "Алеев Владислав", number: 1, position: "Форвард", born: 1999 },
    { name: "Анафин Дархан", number: 2, position: "Центровой", born: 1991 },
    { name: "Абсаламов Айбек", number: 3, position: "Защитник", born: 1990 },
    { name: "Гейнц Артур", number: 4, position: "Форвард", born: 2004 },
    { name: "Голиков Александр", number: 5, position: "Форвард", born: 2006 },
    { name: "Бектас Руслан", number: 6, position: "Защитник", born: 2001 },
    { name: "Нысанов Айбек", number: 7, position: "Центровой", born: 1989 },
    { name: "Любченко Виталий", number: 10, position: "Центровой", born: 1990 },
    { name: "Лиханов Игорь", number: 11, position: "Форвард", born: 1986 },
    { name: "Садыков Диас", number: 12, position: "Форвард", born: 2002 },
    { name: "Жаныбеков Темирлан", number: 14, position: "Защитник", born: 1998 },
    { name: "Косов Дмитрий", number: 15, position: "Форвард", born: 1996 },
    { name: "Егубаев Ерназар", number: 23, position: "Защитник", born: 1997 },
    { name: "Мусралинов Фархат", number: 29, position: "Центровой", born: 2002 },
    { name: "Калашников Александр", number: 47, position: "Форвард", born: 1996 },
  ],
  "Мұнайшы": [
    { name: "Темиргалиев Ораз", number: 1, position: "Защитник", born: 1997 },
    { name: "Жуков Глеб", number: 4, position: "Центровой", born: 1997 },
    { name: "Толеутай Даниял", number: 5, position: "Защитник", born: 2006 },
    { name: "Советхан Досмухаммет", number: 7, position: "Форвард", born: 2000 },
    { name: "Мельников Павел", number: 8, position: "Защитник", born: 1985 },
    { name: "Сагындык Куаныш", number: 9, position: "Форвард", born: 1998 },
    { name: "Безверхов Никита", number: 10, position: "Форвард", born: 2004 },
    { name: "Курбаев Темир", number: 11, position: "Защитник", born: 1992 },
    { name: "Юрков Артём", number: 12, position: "Центровой", born: 2002 },
    { name: "Угизбаев Адиль", number: 13, position: "Защитник", born: 1993 },
    { name: "Мацилецкий Дмитрий", number: 14, position: "Защитник", born: 1996 },
    { name: "Кузнецов Иван", number: 17, position: "Форвард", born: 1985 },
    { name: "Калиев Мурат", number: 23, position: "Защитник", born: 1984 },
    { name: "Галимов Рустам", number: 77, position: "Форвард", born: 1985 },
    { name: "Демесинов Каныш", number: 96, position: "Центровой", born: 1989 },
  ],
  "Успенка": [
    { name: "Слушный Николай", number: 1, position: "Защитник", born: 1997 },
    { name: "Сандр Кирилл", number: 2, position: "Защитник", born: 2009 },
    { name: "Нурманов Диас", number: 3, position: "Форвард", born: 2006 },
    { name: "Дуненбаев Богдан", number: 4, position: "Форвард", born: 2009 },
    { name: "Сагайдак Максим", number: 5, position: "Центровой", born: 1989 },
    { name: "Штапер Николай", number: 6, position: "Защитник", born: 2008 },
    { name: "Пашутин Максим", number: 11, position: "Защитник", born: 2009 },
    { name: "Бондаренко Владислав", number: 15, position: "Форвард", born: 2006 },
    { name: "Роот Николай", number: 22, position: "Защитник", born: 1995 },
    { name: "Ажбулатов Таирхан", number: 25, position: "Защитник", born: 2007 },
    { name: "Байбулов Ануар", number: 33, position: "Форвард", born: 2008 },
    { name: "Мирошниченко Владимир", number: 34, position: "Центровой", born: 2006 },
    { name: "Шефель Артур", number: 41, position: "Защитник", born: 2007 },
    { name: "Абылкалыков Даир", number: 55, position: "Центровой", born: 2004 },
    { name: "Нурманов Тамерлан", number: 77, position: "Защитник", born: 2003 },
  ],
  "TRIX Barystar": [
    { name: "Масимов Заур", number: 0, position: "Защитник", born: 2006 },
    { name: "Козий Артем", number: 1, position: "Защитник", born: 2010 },
    { name: "Марсалыков Нуржан", number: 3, position: "Форвард", born: 1995 },
    { name: "Кушкенов Рустам", number: 4, position: "Форвард", born: 2004 },
    { name: "Соболев Владимир", number: 5, position: "Центровой", born: 1987 },
    { name: "Горьковой Руслан", number: 8, position: "Центровой", born: 2005 },
    { name: "Игошин Виталий", number: 9, position: "Центровой", born: 1999 },
    { name: "Трепенок Илья", number: 10, position: "Центровой", born: 2004 },
    { name: "Логвиненко Рафаэль", number: 17, position: "Форвард", born: 2001 },
    { name: "Шурыгин Самир", number: 22, position: "Форвард", born: 2010 },
    { name: "Остертаг Ларион", number: 23, position: "Форвард", born: 2009 },
    { name: "Батталов Айкын", number: 24, position: "Защитник", born: 2007 },
    { name: "Ершин Султан", number: 69, position: "Защитник", born: 2001 },
    { name: "Зайцев Алексей", number: 98, position: "Центровой", born: 2005 },
  ],
};

const NO_ROSTER: RosterEntry[] = [];

export function rosterOf(teamName: string): RosterEntry[] {
  return ROSTERS[teamName] ?? NO_ROSTER;
}

/* ------------------------------------------------------------------ */
/*  Детерминированный генератор (одинаков на сервере и клиенте)         */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const int = (rng: () => number, min: number, max: number) =>
  min + Math.floor(rng() * (max - min + 1));

/** Базовая «сила» команды влияет на вероятность победы и результативность. */
function strengthOf(teamName: string): number {
  const rng = mulberry32(hashString(`strength:${teamName}`));
  return 0.82 + rng() * 0.4;
}

function emptyPlayer(id: string, number: number, name: string): Player {
  return {
    id, number, name,
    fouls: 0, points: 0, ast: 0, reb_off: 0, reb_def: 0, stl: 0, blk: 0, to: 0,
    fg_made: 0, fg_att: 0, fg3_made: 0, fg3_att: 0, ft_made: 0, ft_att: 0, seconds: 0,
  };
}

export function createPlayer(
  id: string,
  number: number,
  name: string,
  stats: Partial<Omit<Player, 'id' | 'number' | 'name'>> = {},
): Player {
  return { ...emptyPlayer(id, number, name), ...stats };
}

/** Генерирует бокс-скор команды на один матч. */
function buildTeamBox(
  teamName: string,
  matchId: string,
  side: 'h' | 'a',
  strength: number,
  periods: number,
): TeamState {
  const rng = mulberry32(hashString(`${matchId}:${side}:${teamName}`));
  const playing = rosterOf(teamName).slice(0, 9);

  const players: Player[] = playing.map((entry, index) => {
    const starter = index < 5;
    const load = (starter ? 1 : 0.45) * strength * (0.75 + rng() * 0.55);

    const fg3Att = Math.max(0, Math.round(load * int(rng, 0, 7)));
    const fg2Att = Math.max(0, Math.round(load * int(rng, 2, 11)));
    const fg3Made = Math.min(fg3Att, Math.round(fg3Att * (0.22 + rng() * 0.26)));
    const fg2Made = Math.min(fg2Att, Math.round(fg2Att * (0.38 + rng() * 0.26)));
    const ftAtt = Math.round(load * int(rng, 0, 7));
    const ftMade = Math.min(ftAtt, Math.round(ftAtt * (0.55 + rng() * 0.4)));

    return createPlayer(`${matchId}-${side}${index}`, entry.number, entry.name, {
      points: fg2Made * 2 + fg3Made * 3 + ftMade,
      fg_made: fg2Made + fg3Made,
      fg_att: fg2Att + fg3Att,
      fg3_made: fg3Made,
      fg3_att: fg3Att,
      ft_made: ftMade,
      ft_att: ftAtt,
      reb_off: Math.round(load * int(rng, 0, 4)),
      reb_def: Math.round(load * int(rng, 0, 8)),
      ast: Math.round(load * int(rng, 0, 7)),
      stl: Math.round(load * int(rng, 0, 3)),
      blk: Math.round(load * int(rng, 0, 2)),
      to: Math.round(load * int(rng, 0, 4)),
      fouls: Math.min(5, Math.round(load * int(rng, 0, 4))),
      seconds: starter ? int(rng, 1320, 2100) : int(rng, 240, 1140),
    });
  });

  const score = players.reduce((sum, player) => sum + player.points, 0);

  const weights = Array.from({ length: periods }, () => 0.7 + rng() * 0.6);
  const total = weights.reduce((sum, value) => sum + value, 0);
  const quarters: number[] = [];
  let used = 0;
  for (let p = 0; p < periods; p += 1) {
    const value = p === periods - 1 ? score - used : Math.round((score * weights[p]) / total);
    quarters.push(Math.max(0, value));
    used += quarters[p];
  }

  return {
    name: teamName,
    score,
    fouls: players.reduce((sum, player) => sum + player.fouls, 0),
    timeouts: int(rng, 0, 4),
    players,
    quarters,
  };
}

/* ------------------------------------------------------------------ */
/*  Календарь                                                           */
/* ------------------------------------------------------------------ */

/** Реальные матчи стартового тура с сайта лиги. */
const REAL_FIXTURES: {
  id: string; date: string; time: string; home: string; away: string; venue: string;
}[] = [
  { id: 'pbl-5021', date: "2026-11-01", time: "15:00",
    home: "_SHARKS_", away: "Успенка", venue: "АксЗФ (г. Аксу, улица Аксу, 1/3)" },
  { id: 'pbl-5022', date: "2026-11-01", time: "16:00",
    home: "Алюминий Казахстана", away: "БК ВОЛНА", venue: "АксЗФ (г. Аксу, улица Аксу, 1/3)" },
  { id: 'pbl-5023', date: "2026-11-01", time: "17:00",
    home: "Мұнайшы", away: "2bas team", venue: "АксЗФ (г. Аксу, улица Аксу, 1/3)" },
  { id: 'pbl-5024', date: "2026-11-01", time: "18:00",
    home: "STEEL HIPPOS", away: "TRIX Barystar", venue: "АксЗФ (г. Аксу, улица Аксу, 1/3)" },
];

const TIMES = ['15:00', '16:30', '18:00', '19:30'];

/** Круговой турнир: все пары команд. */
function roundRobin(names: string[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) pairs.push([names[i], names[j]]);
  }
  return pairs;
}

const iso = (date: Date) => date.toISOString().slice(0, 10);

function buildMatch(
  id: string,
  home: string,
  away: string,
  date: string,
  time: string,
  venue: string,
  stage: MatchStage,
  status: ArchivedMatch['status'],
): ArchivedMatch {
  const rng = mulberry32(hashString(`meta:${id}`));

  if (status === 'scheduled') {
    const blank = (name: string): TeamState => ({
      name, score: 0, fouls: 0, timeouts: 0, quarters: [], players: [],
    });
    return {
      id, date, time, venue, status, stage,
      season: CURRENT_SEASON, division: CURRENT_DIVISION,
      home: blank(home), away: blank(away),
    };
  }

  const homeBox = buildTeamBox(home, id, 'h', strengthOf(home) * 1.04, 4);
  const awayBox = buildTeamBox(away, id, 'a', strengthOf(away), 4);

  // Ничьих в баскетболе не бывает — добавляем победный бросок хозяевам.
  if (homeBox.score === awayBox.score && homeBox.players.length > 0) {
    const star = homeBox.players[0];
    star.points += 2;
    star.fg_made += 1;
    star.fg_att += 1;
    homeBox.score += 2;
    homeBox.quarters[homeBox.quarters.length - 1] += 2;
  }

  const match: ArchivedMatch = {
    id, date, time, venue, status, stage,
    season: CURRENT_SEASON, division: CURRENT_DIVISION,
    home: homeBox, away: awayBox,
  };

  if (status === 'live') {
    const period = int(rng, 2, 4);
    match.period = period;
    match.clock = `0${int(rng, 1, 9)}:${String(int(rng, 0, 59)).padStart(2, '0')}`;
    match.home.quarters = homeBox.quarters.slice(0, period);
    match.away.quarters = awayBox.quarters.slice(0, period);
    match.home.score = match.home.quarters.reduce((a, b) => a + b, 0);
    match.away.score = match.away.quarters.reduce((a, b) => a + b, 0);
  }

  return match;
}

/**
 * Календарь сезона: двухкруговой турнир по турам раз в неделю.
 * Матчи до дня открытия сезона считаются сыгранными (демо-результаты),
 * реальные матчи стартового тура подставляются на свои настоящие даты.
 */
function buildSeason(): ArchivedMatch[] {
  const names = TEAMS.map((team) => team.name);
  const firstLeg = roundRobin(names);
  const schedule = [...firstLeg, ...firstLeg.map(([h, a]) => [a, h] as [string, string])];

  const realPairs = new Set(REAL_FIXTURES.map((f) => `${f.home}|${f.away}`));
  const start = new Date('2026-09-05T00:00:00Z');
  const perRound = 4;

  const out: ArchivedMatch[] = schedule
    .filter(([home, away]) => !realPairs.has(`${home}|${away}`))
    .map(([home, away], index) => {
      const round = Math.floor(index / perRound);
      const day = new Date(start);
      day.setUTCDate(start.getUTCDate() + round * 7 + (index % perRound > 1 ? 1 : 0));
      const date = iso(day);
      const id = `pbl-g${index}`;

      const played = date < SEASON_OPENING;
      const stage: MatchStage = index % 17 === 16 ? 'friendly' : 'regular';

      return buildMatch(
        id, home, away, date, TIMES[index % perRound], REAL_FIXTURES[0]?.venue ?? '',
        stage, played ? 'final' : 'scheduled',
      );
    });

  // Реальные матчи стартового тура — всегда как запланированные.
  for (const f of REAL_FIXTURES) {
    out.push(buildMatch(f.id, f.home, f.away, f.date, f.time, f.venue, 'regular', 'scheduled'));
  }

  // Один матч последнего сыгранного тура показываем в статусе live.
  const finals = out.filter((m) => m.status === 'final').sort((a, b) => a.date.localeCompare(b.date));
  const liveSource = finals[finals.length - 1];
  if (liveSource) {
    const live = buildMatch(
      liveSource.id, liveSource.home.name, liveSource.away.name,
      liveSource.date, liveSource.time, liveSource.venue, 'regular', 'live',
    );
    const at = out.findIndex((m) => m.id === liveSource.id);
    out[at] = live;
  }

  return out;
}

export const SEED_MATCHES: ArchivedMatch[] = buildSeason().sort(
  (a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time),
);

export const DEFAULT_PROFILE = {
  displayName: 'Гость лиги',
  role: 'fan' as const,
  club: TEAMS[0].name,
};
