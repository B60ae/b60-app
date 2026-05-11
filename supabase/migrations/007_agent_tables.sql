-- Agent support tables: failed queues for retry logic

-- Failed DartPOS order submissions (Order Agent)
create table if not exists failed_dart_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  location_id uuid,
  error text,
  retry_count int not null default 0,
  last_attempted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table failed_dart_orders enable row level security;

create policy "Service role full access" on failed_dart_orders
  to service_role
  using (true)
  with check (true);

-- Failed loyalty point awards (Loyalty Agent)
create table if not exists failed_loyalty_awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  source_id text not null,
  amount numeric not null,
  source text not null,
  is_direct_amount boolean not null default false,
  error text,
  retry_count int not null default 0,
  last_attempted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table failed_loyalty_awards enable row level security;

create policy "Service role full access" on failed_loyalty_awards
  to service_role
  using (true)
  with check (true);

-- Failed game prizes (Games Agent)
create table if not exists failed_prizes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  source_id text not null,
  game_type text not null,
  prize_type text not null,
  prize_value numeric not null default 0,
  retry_count int not null default 0,
  last_attempted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table failed_prizes enable row level security;

create policy "Service role full access" on failed_prizes
  to service_role
  using (true)
  with check (true);

-- Index for cron queries (retry_count filter + ordered by created_at)
create index if not exists idx_failed_dart_orders_retry on failed_dart_orders(retry_count, created_at);
create index if not exists idx_failed_loyalty_awards_retry on failed_loyalty_awards(retry_count, created_at);
create index if not exists idx_failed_prizes_retry on failed_prizes(retry_count, created_at);
