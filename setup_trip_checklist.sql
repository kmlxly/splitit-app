-- Create trip_checklists table
CREATE TABLE IF NOT EXISTS public.trip_checklists (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
    title text NOT NULL,
    created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- Create trip_checklist_items table
CREATE TABLE IF NOT EXISTS public.trip_checklist_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    checklist_id uuid REFERENCES public.trip_checklists(id) ON DELETE CASCADE,
    item_name text NOT NULL,
    is_checked boolean DEFAULT false,
    checked_by uuid REFERENCES auth.users(id),
    created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trip_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_checklist_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Checklists select policy" ON public.trip_checklists FOR SELECT USING (true);
CREATE POLICY "Checklists insert policy" ON public.trip_checklists FOR INSERT WITH CHECK (true);
CREATE POLICY "Checklists delete policy" ON public.trip_checklists FOR DELETE USING (true);

CREATE POLICY "Items select policy" ON public.trip_checklist_items FOR SELECT USING (true);
CREATE POLICY "Items insert policy" ON public.trip_checklist_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Items update policy" ON public.trip_checklist_items FOR UPDATE USING (true);
CREATE POLICY "Items delete policy" ON public.trip_checklist_items FOR DELETE USING (true);
