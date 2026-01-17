-- FIX SPLITIT DATABASE TABLES & POLICIES

-- 1. Create 'sessions' table if not exists
create table if not exists public.sessions (
  id text primary key,
  owner_id uuid references auth.users,
  name text,
  currency text default 'RM',
  people jsonb,
  paid_status jsonb,
  updated_at timestamptz default now()
);

-- 2. Create 'bills' table if not exists
create table if not exists public.bills (
  id text primary key,
  session_id text references public.sessions(id) on delete cascade,
  title text,
  type text,
  total_amount numeric,
  paid_by text,
  details jsonb,
  menu_items jsonb,
  misc_amount numeric,
  discount_amount numeric,
  tax_method text,
  discount_method text,
  original_currency text,
  original_amount numeric,
  exchange_rate numeric,
  created_at timestamptz default now()
);

-- 3. Enable RLS
alter table public.sessions enable row level security;
alter table public.bills enable row level security;

-- 4. Create Policies (PERMISSIVE)

-- Allow anyone to create a session (Authenticated)
create policy "Enable insert for authenticated users only"
on public.sessions for insert
to authenticated
with check (true);

-- Allow owner to do anything
create policy "Owner can do all on sessions"
on public.sessions for all
using (auth.uid() = owner_id);

-- Allow ANYONE to view sessions (Simplistic for sharing, ideally check people array)
-- For now, we allow public read if they have the ID (UUIDs are hard to guess)
create policy "Enable read access for all users"
on public.sessions for select
using (true);

-- Allow ANYONE to update sessions (needed for members to update paid_status etc)
-- Warning: This is permissive. Ideally we check if auth.uid() is in 'people'.
create policy "Enable update for all users"
on public.sessions for update
using (true);

-- BILLS Policies
create policy "Enable read access for all users"
on public.bills for select
using (true);

create policy "Enable insert for all users"
on public.bills for insert
with check (true);

create policy "Enable update for all users"
on public.bills for update
using (true);

create policy "Enable delete for all users"
on public.bills for delete
using (true);
