-- Схема базы ПБЛ. Выполните в SQL Editor проекта Supabase.
--
-- Доступ:
--   * заявки команд (applications) — отправить может любой посетитель без
--     регистрации, читать с сайта нельзя (персональные данные);
--   * живой протокол (live_events) — читают все, пишут только судьи;
--   * судьи (judges) — пользователи Supabase Auth, которых администратор внёс
--     в эту таблицу. Регистрации на сайте нет.

/* ----------------------------- Судьи ------------------------------ */

create table if not exists public.judges (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  name       text        not null default '',
  created_at timestamptz not null default now()
);

alter table public.judges enable row level security;

-- Судья видит только свою строку — так сайт проверяет право на столик.
drop policy if exists "judges read own row" on public.judges;
create policy "judges read own row"
  on public.judges for select
  to authenticated
  using (user_id = auth.uid());

-- Как добавить судью:
--   1. Authentication → Users → Add user (e-mail + пароль, Auto Confirm).
--   2. insert into public.judges (user_id, name)
--      select id, 'Иванов Иван' from auth.users where email = 'judge@example.com';

/* ------------------------- Заявки команд -------------------------- */

create table if not exists public.applications (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  team_name    text not null,
  captain_name text not null,
  phone        text not null,
  email        text not null,
  division     text not null default '',
  roster       text not null,
  comment      text not null default ''
);

alter table public.applications enable row level security;

-- Открытая форма для капитанов: только вставка, без чтения.
drop policy if exists "applications insert for everyone" on public.applications;
create policy "applications insert for everyone"
  on public.applications for insert
  to anon, authenticated
  with check (true);

/* ----------------------- Живой протокол --------------------------- */

create table if not exists public.live_events (
  id            text primary key,
  match_id      text        not null,
  created_at    timestamptz not null default now(),
  period        integer     not null default 1,
  clock         text        not null default '10:00',
  side          text        not null check (side in ('home', 'away', 'system')),
  team          text        not null default '',
  kind          text        not null check (
                  kind in ('score', 'miss', 'foul', 'timeout', 'sub', 'stat', 'period', 'system')
                ),
  points        integer,
  player_name   text,
  player_number integer,
  text          text        not null
);

create index if not exists live_events_match_created_idx
  on public.live_events (match_id, created_at desc);

alter table public.live_events enable row level security;

-- Читать протокол может любой зритель трансляции.
drop policy if exists "live_events read for anon" on public.live_events;
create policy "live_events read for anon"
  on public.live_events for select
  to anon, authenticated
  using (true);

-- Писать — только судьи. Старая демо-политика открывала запись всем.
drop policy if exists "live_events insert for anon" on public.live_events;
drop policy if exists "live_events insert for judges" on public.live_events;
create policy "live_events insert for judges"
  on public.live_events for insert
  to authenticated
  with check (exists (select 1 from public.judges j where j.user_id = auth.uid()));

-- Включить realtime-трансляцию вставок (повторный запуск выдаст ошибку,
-- если таблица уже в публикации, — тогда эту строку можно пропустить).
alter publication supabase_realtime add table public.live_events;
