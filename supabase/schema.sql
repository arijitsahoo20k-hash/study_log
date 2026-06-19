-- ============================================================
-- STUDYLOG — Supabase schema
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query)
-- ============================================================

-- 1. ENTRIES TABLE
-- One row = one day's study log + photo for one user.
create table if not exists public.entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  study_date      date not null,
  photo_path      text not null,            -- storage object path, NEVER a public url
  focus_score     smallint not null check (focus_score between 1 and 5),
  hours_studied   numeric(4,1) not null check (hours_studied >= 0 and hours_studied <= 24),
  subject         text,
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, study_date)
);

create index if not exists entries_user_date_idx
  on public.entries (user_id, study_date desc);

-- 2. STREAK FREEZES TABLE
-- Tracks the "grace day" tokens used to protect a streak.
create table if not exists public.streak_freezes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  used_on_date  date not null,
  created_at    timestamptz not null default now(),
  unique (user_id, used_on_date)
);

-- 3. updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists entries_set_updated_at on public.entries;
create trigger entries_set_updated_at
  before update on public.entries
  for each row execute function public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY — every row is private to its owner
-- ============================================================
alter table public.entries enable row level security;
alter table public.streak_freezes enable row level security;

drop policy if exists "select own entries" on public.entries;
create policy "select own entries" on public.entries
  for select using (auth.uid() = user_id);

drop policy if exists "insert own entries" on public.entries;
create policy "insert own entries" on public.entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own entries" on public.entries;
create policy "update own entries" on public.entries
  for update using (auth.uid() = user_id);

drop policy if exists "delete own entries" on public.entries;
create policy "delete own entries" on public.entries
  for delete using (auth.uid() = user_id);

drop policy if exists "select own freezes" on public.streak_freezes;
create policy "select own freezes" on public.streak_freezes
  for select using (auth.uid() = user_id);

drop policy if exists "insert own freezes" on public.streak_freezes;
create policy "insert own freezes" on public.streak_freezes
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- STORAGE — private bucket, folder-per-user, signed URLs only
-- ============================================================
insert into storage.buckets (id, name, public)
values ('study-photos', 'study-photos', false)
on conflict (id) do nothing;

-- Photos must live at  {user_id}/{filename}  — policies enforce that
-- the first path segment matches the requesting user's id.

drop policy if exists "read own photos" on storage.objects;
create policy "read own photos" on storage.objects
  for select using (
    bucket_id = 'study-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "upload own photos" on storage.objects;
create policy "upload own photos" on storage.objects
  for insert with check (
    bucket_id = 'study-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "delete own photos" on storage.objects;
create policy "delete own photos" on storage.objects
  for delete using (
    bucket_id = 'study-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Done. The bucket is PRIVATE (public = false), so photos are
-- only ever reachable through short-lived signed URLs generated
-- server-side by Supabase for the authenticated owner.
-- ============================================================
