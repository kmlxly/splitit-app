-- RUN THIS SCRIPT IN YOUR SUPABASE SQL EDITOR --

-- 1. Create 'savings_goals' table if not exists
create table if not exists public.savings_goals (
  id bigint primary key, -- Matches Date.now()
  user_id uuid references auth.users not null,
  title text not null,
  target_amount numeric not null,
  current_amount numeric default 0,
  color text default 'bg-blue-500',
  target_date text, -- Optional: YYYY-MM-DD
  updated_at timestamptz default now()
);

-- 2. Enable Row Level Security (RLS)
alter table public.savings_goals enable row level security;

-- 3. Create Policies
create policy "Users can view own goals"
  on public.savings_goals for select
  using ( auth.uid() = user_id );

create policy "Users can insert own goals"
  on public.savings_goals for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own goals"
  on public.savings_goals for update
  using ( auth.uid() = user_id );

create policy "Users can delete own goals"
  on public.savings_goals for delete
  using ( auth.uid() = user_id );
