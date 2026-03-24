-- B60 Burgers App — Initial Schema
-- Run this in your Supabase SQL editor

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Users ───────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id              uuid primary key default uuid_generate_v4(),
  phone           text unique not null,
  name            text not null default '',
  email           text,
  avatar_url      text,
  loyalty_points  integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Menu Categories ─────────────────────────────────────────────────────────
create table if not exists public.menu_categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text unique not null,
  sort_order  integer not null default 0
);

-- ─── Menu Items ──────────────────────────────────────────────────────────────
create table if not exists public.menu_items (
  id             uuid primary key default uuid_generate_v4(),
  category_id    uuid references public.menu_categories(id) on delete cascade,
  name           text not null,
  description    text not null default '',
  price          numeric(10,2) not null,
  image_url      text not null default '',
  is_available   boolean not null default true,
  is_featured    boolean not null default false,
  calories       integer,
  customizations jsonb default '[]'::jsonb,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now()
);

-- ─── Locations ───────────────────────────────────────────────────────────────
create table if not exists public.locations (
  id          text primary key,  -- e.g. 'oud-metha'
  name        text not null,
  address     text not null,
  city        text not null,
  phone       text,
  lat         numeric(10,6),
  lng         numeric(10,6),
  is_open     boolean not null default true,
  open_hours  text not null default '10:00 AM – 11:00 PM'
);

-- ─── Orders ──────────────────────────────────────────────────────────────────
create type order_status as enum ('pending','confirmed','preparing','ready','completed','cancelled');

create table if not exists public.orders (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references public.users(id) on delete set null,
  location_id         text references public.locations(id),
  items               jsonb not null default '[]'::jsonb,
  status              order_status not null default 'pending',
  subtotal            numeric(10,2) not null,
  points_redeemed     integer not null default 0,
  discount            numeric(10,2) not null default 0,
  total               numeric(10,2) not null,
  points_earned       integer not null default 0,
  dart_pos_order_id   text,
  estimated_ready_at  timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── Loyalty Transactions ─────────────────────────────────────────────────────
create type loyalty_tx_type as enum ('earned','redeemed','expired','bonus');

create table if not exists public.loyalty_transactions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.users(id) on delete cascade,
  order_id    uuid references public.orders(id) on delete set null,
  type        loyalty_tx_type not null,
  points      integer not null,
  description text not null,
  created_at  timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists loyalty_tx_user_id_idx on public.loyalty_transactions(user_id);
create index if not exists menu_items_category_idx on public.menu_items(category_id);
create index if not exists menu_items_featured_idx on public.menu_items(is_featured) where is_featured = true;

-- ─── Updated At Trigger ───────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.orders enable row level security;
alter table public.loyalty_transactions enable row level security;

-- Users can only read/update their own row
create policy "users_self" on public.users
  for all using (id = auth.uid()::uuid);

-- Orders visible to owner only
create policy "orders_owner" on public.orders
  for all using (user_id = auth.uid()::uuid);

-- Loyalty transactions visible to owner only
create policy "loyalty_owner" on public.loyalty_transactions
  for all using (user_id = auth.uid()::uuid);

-- Menu and locations are public read
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.locations enable row level security;

create policy "menu_categories_read" on public.menu_categories for select using (true);
create policy "menu_items_read" on public.menu_items for select using (true);
create policy "locations_read" on public.locations for select using (true);
