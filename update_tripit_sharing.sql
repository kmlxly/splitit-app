-- UPDATE TRIPIT FOR SHARING & ROLES

-- 1. ADD COLUMNS FOR SHARING
alter table public.trips 
add column if not exists share_token_view text default encode(gen_random_bytes(12), 'hex'), -- Token untuk View Only
add column if not exists share_token_edit text default encode(gen_random_bytes(12), 'hex'); -- Token untuk Editor

-- 2. ADD ROLE TO MEMBER
alter table public.trip_members
add column if not exists role text default 'viewer' check (role in ('owner', 'editor', 'viewer'));

-- 3. ENABLE RLS FOR TRIP MEMBERS (Fixing previous simplified policy)
drop policy if exists "Users can CRUD members of own trips" on public.trip_members;

-- Policy: Members can view other members in the same trip
create policy "Members can view list" on public.trip_members
  for select using (
    exists (
      select 1 from public.trips 
      where id = trip_members.trip_id 
      and (owner_id = auth.uid() or 
           exists (select 1 from public.trip_members tm where tm.trip_id = trips.id and tm.auth_id = auth.uid()))
    )
  );

-- Policy: Owner & Editors can add members
create policy "Owner/Editors can add members" on public.trip_members
  for insert with check (
    exists (
      select 1 from public.trips 
      where id = trip_id 
      and (owner_id = auth.uid() or 
           exists (select 1 from public.trip_members tm where tm.trip_id = trips.id and tm.auth_id = auth.uid() and tm.role = 'editor'))
    )
  );

-- 4. UPDATE TRIPS POLICY (Allow Members to View/Edit)
drop policy if exists "Users can CRUD own trips" on public.trips;

-- Policy: Owner has full access
create policy "Owner full access" on public.trips
  for all using (owner_id = auth.uid());

-- Policy: Members can VIEW trip
create policy "Members can view trip" on public.trips
  for select using (
    exists (select 1 from public.trip_members where trip_id = id and auth_id = auth.uid())
  );

-- Policy: Editors can UPDATE trip details
create policy "Editors can update trip" on public.trips
  for update using (
    exists (select 1 from public.trip_members where trip_id = id and auth_id = auth.uid() and role = 'editor')
  );

-- 5. UPDATE ITEMS POLICY (Secure Items)
drop policy if exists "Users can CRUD items of own trips" on public.trip_items;

-- Policy: View Items (All Members)
create policy "Members can view items" on public.trip_items
  for select using (
    exists (select 1 from public.trip_members where trip_id = trip_items.trip_id and auth_id = auth.uid())
    or exists (select 1 from public.trips where id = trip_items.trip_id and owner_id = auth.uid())
  );

-- Policy: Manage Items (Owner + Editors + Viewers?? No, Viewers read only)
-- Let's say Editors and Owner can Add/Edit Items.
create policy "Owner/Editors can manage items" on public.trip_items
  for all using (
    exists (select 1 from public.trips where id = trip_items.trip_id and owner_id = auth.uid())
    or exists (select 1 from public.trip_members where trip_id = trip_items.trip_id and auth_id = auth.uid() and role in ('editor', 'owner'))
  );

-- 6. FUNCTION TO JOIN TRIP BY TOKEN
create or replace function public.join_trip_by_token(token_input text)
returns json as $$
declare
  target_trip_id uuid;
  assigned_role text;
  result json;
begin
  -- Cari Trip berdasarkan View Token
  select id, 'viewer' into target_trip_id, assigned_role from public.trips where share_token_view = token_input;
  
  -- Kalau tak jumpa, cari Edit Token
  if target_trip_id is null then
    select id, 'editor' into target_trip_id, assigned_role from public.trips where share_token_edit = token_input;
  end if;

  -- Kalau tak jumpa langsung
  if target_trip_id is null then
    return json_build_object('success', false, 'message', 'Invalid Token');
  end if;

  -- Check if user already member
  if exists (select 1 from public.trip_members where trip_id = target_trip_id and auth_id = auth.uid()) then
     return json_build_object('success', true, 'message', 'Already joined', 'trip_id', target_trip_id);
  end if;

  -- Insert Member
  insert into public.trip_members (trip_id, auth_id, name, role)
  values (target_trip_id, auth.uid(), 'New Member', assigned_role);

  return json_build_object('success', true, 'message', 'Joined successfully', 'trip_id', target_trip_id, 'role', assigned_role);
end;
$$ language plpgsql security definer;
