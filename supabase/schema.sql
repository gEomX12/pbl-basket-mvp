-- Таблица живого протокола матча (play-by-play).
-- Выполните в SQL Editor проекта Supabase.

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

-- Демо-доступ: читать и писать может любой клиент с anon-ключом.
-- Для продакшена замените на политику с проверкой роли судейского столика.
create policy "live_events read for anon"
  on public.live_events for select
  to anon, authenticated
  using (true);

create policy "live_events insert for anon"
  on public.live_events for insert
  to anon, authenticated
  with check (true);

-- Включить realtime-трансляцию вставок.
alter publication supabase_realtime add table public.live_events;
