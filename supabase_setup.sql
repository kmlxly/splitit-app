-- RUN THIS SCRIPT IN YOUR SUPABASE SQL EDITOR --

-- 1. Create 'budget_transactions' table if not exists
create table if not exists public.budget_transactions (
  id bigint primary key, -- Matches local Date.now()
  user_id uuid references auth.users not null,
  title text not null,
  amount numeric not null,
  category text,
  date text,
  iso_date text,
  updated_at timestamptz default now()
);

-- 2. Create 'subscriptions' table if not exists
create table if not exists public.subscriptions (
  id bigint primary key,
  user_id uuid references auth.users not null,
  title text not null,
  price numeric not null,
  cycle text,
  first_bill_date text,
  category text,
  share_with text,
  link text,
  updated_at timestamptz default now()
);

-- 3. Enable Row Level Security (RLS)
alter table public.budget_transactions enable row level security;
alter table public.subscriptions enable row level security;

-- 4. Create Policies to allow Users to View/Edit ONLY their own data

-- Budget Policies
create policy "Users can view own budget info"
  on public.budget_transactions for select
  using ( auth.uid() = user_id );

create policy "Users can insert own budget info"
  on public.budget_transactions for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own budget info"
  on public.budget_transactions for update
  using ( auth.uid() = user_id );

create policy "Users can delete own budget info"
  on public.budget_transactions for delete
  using ( auth.uid() = user_id );

-- Subscriptions Policies
create policy "Users can view own subs"
  on public.subscriptions for select
  using ( auth.uid() = user_id );

create policy "Users can insert own subs"
  on public.subscriptions for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own subs"
  on public.subscriptions for update
  using ( auth.uid() = user_id );

create policy "Users can delete own subs"
  on public.subscriptions for delete
  using ( auth.uid() = user_id );
