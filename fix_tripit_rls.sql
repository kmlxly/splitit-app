-- FIX INFINITE RECURSION IN RLS

-- 1. DROP EXISTING POLICIES TO START FRESH
drop policy if exists "Users can CRUD own trips" on public.trips;
drop policy if exists "Members can view trip" on public.trips;
drop policy if exists "Editors can update trip" on public.trips;
drop policy if exists "Owner full access" on public.trips;

drop policy if exists "Members can view list" on public.trip_members;
drop policy if exists "Owner/Editors can add members" on public.trip_members;

-- 2. SIMPLIFY TRIPS POLICY
-- Owner can do EVERYTHING.
create policy "Owner CRUD trips" on public.trips
  for all using (owner_id = auth.uid());

-- Members can VIEW trips they are part of. 
-- IMPORTANT: We check 'auth_id' directly in trip_members to avoid joining back to trips prematurely.
create policy "Members view trips" on public.trips
  for select using (
    exists (select 1 from public.trip_members where trip_id = id and auth_id = auth.uid())
  );

-- Editors can UPDATE trips they are part of.
create policy "Editors update trips" on public.trips
  for update using (
    exists (select 1 from public.trip_members where trip_id = id and auth_id = auth.uid() and role = 'editor')
  );


-- 3. SIMPLIFY TRIP_MEMBERS POLICY (The source of recursion)
-- We need to break the loop. We will rely on security definer functions for complex logic if needed,
-- but for now, let's keep it simple.

-- Allow users to view members of trips they belong to OR trips they own.
-- Instead of checking "trip.owner_id", we assume if you can see the trip (via trip policy above), you can see members?
-- No, that causes recursion. 
-- Let's do a direct check table-to-table without circularity.

create policy "View members" on public.trip_members
  for select using (
    -- You are the member yourself
    auth_id = auth.uid()
    OR
    -- You are the owner of the trip (fetch owner from trips table - this is safe direction)
    exists (select 1 from public.trips where id = trip_id and owner_id = auth.uid())
    OR
    -- You are another member in the same trip (this is the risky one! Let's optimize it)
    -- We can just check if auth.uid() is in the member list for that trip_id
    trip_id in (select trip_id from public.trip_members where auth_id = auth.uid())
  );

create policy "Insert members" on public.trip_members
  for insert with check (
    -- Only Owner can insert (for now, to be safe)
    exists (select 1 from public.trips where id = trip_id and owner_id = auth.uid())
  );

create policy "Manage members" on public.trip_members
  for delete using (
    -- Only Owner can remove members
    exists (select 1 from public.trips where id = trip_id and owner_id = auth.uid())
  );
