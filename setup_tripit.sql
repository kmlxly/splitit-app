-- RUN THIS IN SUPABASE SQL EDITOR TO SETUP TRIPIT

-- 1. TRIPS TABLE (Jadual Trip Utama)
create table public.trips (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz default now(),
  owner_id uuid references auth.users not null, -- link to owner
  name text not null, -- e.g. "Japan Winter"
  start_date date,
  end_date date,
  cover_image text, -- URL image
  budget_limit numeric default 0, -- Target Budget e.g. 5000
  currency text default 'MYR',
  primary key (id)
);

-- 2. TRIP MEMBERS (Ahli Trip - boleh link user atau manual name)
create table public.trip_members (
  id uuid not null default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null,
  name text not null, -- "Kamal"
  auth_id uuid references auth.users, -- if registered user
  avatar_url text, -- optional
  primary key (id)
);

-- 3. TRIP ITINERARY ITEMS (Jadual & Cost serentak)
create table public.trip_items (
  id uuid not null default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null,
  day_date date not null, -- Tarikh item ni berlaku
  start_time time, -- Pukul berapa (10:00 AM)
  type text not null, -- 'flight', 'hotel', 'food', 'activity', 'transport'
  title text not null, -- "Flight to KIX"
  location text, -- "KLIA Terminal 1"
  cost numeric default 0, -- Kos item (0 kalau free visit)
  payer_id uuid references public.trip_members, -- Siapa bayar (Auto masuk Split Bill)
  split_details jsonb, -- Logic split bill (sama macam SplitIt)
  created_at timestamptz default now(),
  primary key (id)
);

-- 4. RLS POLICIES (Safety First)
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_items enable row level security;

-- Simple Policy: Owner can do everything
create policy "Users can CRUD own trips" on public.trips 
  for all using (auth.uid() = owner_id);

-- Members & Items policies inherit from trip ownership (simplified for now)
create policy "Users can CRUD members of own trips" on public.trip_members
  for all using (
    exists (select 1 from public.trips where id = trip_id and owner_id = auth.uid())
  );

create policy "Users can CRUD items of own trips" on public.trip_items
  for all using (
    exists (select 1 from public.trips where id = trip_id and owner_id = auth.uid())
  );
