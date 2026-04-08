-- B60 Burgers — Migration 003
-- Fix users table to align with email-only OTP auth
-- phone was NOT NULL but our auth flow only collects email

-- Make phone nullable (existing rows won't break)
alter table public.users
  alter column phone drop not null,
  alter column phone set default null;

-- Drop old phone unique constraint (may fail if already gone — OK)
alter table public.users
  drop constraint if exists users_phone_key;

-- Ensure email is unique and indexed
alter table public.users
  add constraint users_email_key unique (email);

-- Add index for email lookups (auth hot path)
create index if not exists users_email_idx on public.users (email);

-- Ensure loyalty_points has a floor of 0
alter table public.users
  add constraint users_loyalty_points_positive check (loyalty_points >= 0);
