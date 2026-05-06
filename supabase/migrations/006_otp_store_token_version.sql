-- Migration 006: Persistent OTP store + JWT token versioning

-- ─── 1. OTP store (replaces in-memory Map) ───────────────────────────────────
create table if not exists public.otp_store (
  email       text primary key,
  otp_hash    text not null,          -- bcrypt/SHA-256 hash, never plain text
  attempts    integer not null default 0,
  locked_until timestamptz,           -- set after 5 failed attempts
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

-- Auto-cleanup: delete expired OTPs older than 10 minutes
-- Run this periodically via pg_cron or just let the app clean up on read
create index if not exists otp_store_expires_idx on public.otp_store(expires_at);

-- No RLS needed — service role only, never exposed to client
alter table public.otp_store enable row level security;
-- No policies = service role only

-- ─── 2. token_version on users (JWT revocation) ───────────────────────────────
alter table public.users
  add column if not exists token_version integer not null default 0;

-- Bump token_version to invalidate all existing JWTs for a user:
-- UPDATE users SET token_version = token_version + 1 WHERE id = '<user_id>';
