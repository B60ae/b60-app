-- ─── Migration 005: Legal consent tracking, Games RLS, Analytics events ──────
-- Run in Supabase SQL editor

-- ─── 1. Legal consent + security columns on users ────────────────────────────
alter table public.users
  add column if not exists terms_accepted_at   timestamptz,
  add column if not exists terms_version       text,        -- e.g. '2026-05'
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists is_suspended        boolean not null default false;

-- ─── 2. Consent audit log ─────────────────────────────────────────────────────
create table if not exists public.consent_log (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.users(id) on delete cascade,
  email       text not null,
  version     text not null,
  accepted_at timestamptz not null default now(),
  ip_hash     text,         -- SHA-256 of IP, never raw IP
  platform    text          -- 'android' | 'ios'
);

create index if not exists consent_log_user_idx on public.consent_log(user_id);

-- RLS: users see their own consent log; service role inserts
alter table public.consent_log enable row level security;
create policy "consent_read_own" on public.consent_log
  for select using (user_id = auth.uid()::uuid);

-- ─── 3. Games tables RLS ─────────────────────────────────────────────────────
-- game_spins
alter table public.game_spins enable row level security;
create policy "game_spins_owner" on public.game_spins
  for all using (user_id = auth.uid()::uuid);

-- game_tap_scores
alter table public.game_tap_scores enable row level security;
create policy "game_tap_owner" on public.game_tap_scores
  for all using (user_id = auth.uid()::uuid);

-- game_streaks
alter table public.game_streaks enable row level security;
create policy "game_streaks_owner" on public.game_streaks
  for all using (user_id = auth.uid()::uuid);

-- game_vouchers
alter table public.game_vouchers enable row level security;
create policy "game_vouchers_owner" on public.game_vouchers
  for all using (user_id = auth.uid()::uuid);

-- game_leaderboard: all authenticated users can read; only own row write
alter table public.game_leaderboard enable row level security;
create policy "leaderboard_read_all" on public.game_leaderboard
  for select using (true);
create policy "leaderboard_write_own" on public.game_leaderboard
  for insert with check (user_id = auth.uid()::uuid);
create policy "leaderboard_update_own" on public.game_leaderboard
  for update using (user_id = auth.uid()::uuid);

-- ─── 4. Analytics events table ───────────────────────────────────────────────
create table if not exists public.analytics_events (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.users(id) on delete set null,
  event_name  text not null,
  properties  jsonb not null default '{}'::jsonb,
  platform    text,      -- 'android' | 'ios'
  app_version text,
  created_at  timestamptz not null default now()
);

create index if not exists analytics_events_user_idx on public.analytics_events(user_id);
create index if not exists analytics_events_name_idx on public.analytics_events(event_name);
create index if not exists analytics_events_time_idx on public.analytics_events(created_at desc);

-- Users cannot read/write analytics directly (service role only)
alter table public.analytics_events enable row level security;
-- No policies = service role only via backend
