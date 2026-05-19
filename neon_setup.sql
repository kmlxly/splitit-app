-- ================================================================
-- NEON DATABASE SETUP (Migrated from Supabase)
-- Run this script in Neon SQL Editor (console.neon.tech)
-- ================================================================
-- Notes:
--   1) Neon Auth (Better Auth) creates and manages its own `neon_auth.user`
--      table (id is a UUID, but Better Auth always serializes it as a string).
--   2) RLS (Row-Level Security) policies have been removed.
--      Access control is enforced in Next.js server actions via
--      `requireServerUser()` from `lib/auth/server.ts`.
--   3) User-ID columns are TEXT to accept the stringified UUIDs that Neon Auth
--      returns from `auth.getSession()`. We do NOT create a foreign key to
--      `neon_auth.user(id)` so Neon Auth can manage its schema independently.
-- ================================================================

-- Required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================================================
-- 1) BUDGET TRANSACTIONS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.budget_transactions (
  id BIGINT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT,
  date TEXT,
  iso_date TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_user
  ON public.budget_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_budget_iso_date
  ON public.budget_transactions(iso_date);

-- ================================================================
-- 2) SUBSCRIPTIONS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id BIGINT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  price NUMERIC NOT NULL,
  cycle TEXT,
  first_bill_date TEXT,
  category TEXT,
  share_with TEXT,
  link TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user
  ON public.subscriptions(user_id);

-- ================================================================
-- 3) SPLITIT - SESSIONS & BILLS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id TEXT PRIMARY KEY,
  owner_id TEXT,
  name TEXT,
  currency TEXT DEFAULT 'RM',
  people JSONB,
  paid_status JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_owner
  ON public.sessions(owner_id);

CREATE TABLE IF NOT EXISTS public.bills (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES public.sessions(id) ON DELETE CASCADE,
  title TEXT,
  type TEXT,
  total_amount NUMERIC,
  paid_by TEXT,
  details JSONB,
  menu_items JSONB,
  misc_amount NUMERIC,
  discount_amount NUMERIC,
  tax_method TEXT,
  discount_method TEXT,
  original_currency TEXT,
  original_amount NUMERIC,
  exchange_rate NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bills_session
  ON public.bills(session_id);

-- SPLITIT - SESSION MEMBERS (for shared sessions via invite link)
CREATE TABLE IF NOT EXISTS public.session_members (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_session_members_user
  ON public.session_members(user_id);

CREATE INDEX IF NOT EXISTS idx_session_members_session
  ON public.session_members(session_id);

-- ================================================================
-- 4) TRIPIT - TRIPS, MEMBERS, ITEMS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  cover_image TEXT,
  budget_limit NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'MYR',
  destination_currency TEXT DEFAULT 'SGD',
  share_token_view TEXT DEFAULT encode(gen_random_bytes(12), 'hex'),
  share_token_edit TEXT DEFAULT encode(gen_random_bytes(12), 'hex'),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_trips_owner
  ON public.trips(owner_id);

CREATE TABLE IF NOT EXISTS public.trip_members (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  auth_id TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_trip_members_trip
  ON public.trip_members(trip_id);

CREATE INDEX IF NOT EXISTS idx_trip_members_auth
  ON public.trip_members(auth_id);

CREATE TABLE IF NOT EXISTS public.trip_items (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  day_date DATE NOT NULL,
  start_time TIME,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  cost NUMERIC DEFAULT 0,
  color TEXT DEFAULT 'bg-blue-600',
  is_completed BOOLEAN DEFAULT FALSE,
  payer_id UUID REFERENCES public.trip_members(id),
  split_details JSONB,
  original_currency TEXT DEFAULT 'MYR',
  original_amount NUMERIC DEFAULT 0,
  exchange_rate NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_trip_items_trip
  ON public.trip_items(trip_id);

-- ================================================================
-- 5) TRIPIT - PERSONAL EXPENSES
-- ================================================================
CREATE TABLE IF NOT EXISTS public.trip_personal_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  original_currency TEXT DEFAULT 'MYR',
  original_amount NUMERIC DEFAULT 0,
  exchange_rate NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_trip_personal_expenses_trip_user
  ON public.trip_personal_expenses(trip_id, user_id);

-- ================================================================
-- 6) TRIPIT - DOCUMENTS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.trip_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id TEXT,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  type TEXT DEFAULT 'other',
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_documents_trip
  ON public.trip_documents(trip_id);

-- ================================================================
-- 7) TRIPIT - CHECKLISTS
-- ================================================================
CREATE TABLE IF NOT EXISTS public.trip_checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_checklists_trip
  ON public.trip_checklists(trip_id);

CREATE TABLE IF NOT EXISTS public.trip_checklist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID REFERENCES public.trip_checklists(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  is_checked BOOLEAN DEFAULT FALSE,
  checked_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_checklist_items_checklist
  ON public.trip_checklist_items(checklist_id);

-- ================================================================
-- 8) FUNCTION: join_trip_by_token
-- Called from server action with the authenticated user_id passed in.
-- Returns the trip id and assigned role (viewer/editor) or NULL.
-- ================================================================
CREATE OR REPLACE FUNCTION public.join_trip_by_token(
  token_input TEXT,
  current_user_id TEXT,
  current_user_name TEXT
)
RETURNS JSON AS $$
DECLARE
  target_trip_id UUID;
  assigned_role TEXT;
BEGIN
  -- Cari Trip berdasarkan View Token
  SELECT id, 'viewer'
    INTO target_trip_id, assigned_role
    FROM public.trips
    WHERE share_token_view = token_input;

  -- Kalau tak jumpa, cuba Edit Token
  IF target_trip_id IS NULL THEN
    SELECT id, 'editor'
      INTO target_trip_id, assigned_role
      FROM public.trips
      WHERE share_token_edit = token_input;
  END IF;

  -- Kalau tak jumpa langsung
  IF target_trip_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Invalid Token');
  END IF;

  -- Check kalau dah jadi member
  IF EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = target_trip_id AND auth_id = current_user_id
  ) THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Already joined',
      'trip_id', target_trip_id
    );
  END IF;

  -- Insert sebagai member baru
  INSERT INTO public.trip_members (trip_id, auth_id, name, role)
  VALUES (target_trip_id, current_user_id, current_user_name, assigned_role);

  RETURN json_build_object(
    'success', true,
    'message', 'Joined successfully',
    'trip_id', target_trip_id,
    'role', assigned_role
  );
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- DONE. Verify with:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' ORDER BY table_name;
-- ================================================================
