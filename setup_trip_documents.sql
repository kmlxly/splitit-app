-- Create trip_documents table
CREATE TABLE IF NOT EXISTS public.trip_documents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    title text NOT NULL,
    file_url text NOT NULL,
    type text DEFAULT 'other',
    created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trip_documents ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view documents of trips they are members of" ON public.trip_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.trip_members
            WHERE trip_members.trip_id = trip_documents.trip_id
            AND trip_members.auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert documents into trips they are members of" ON public.trip_documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.trip_members
            WHERE trip_members.trip_id = trip_documents.trip_id
            AND trip_members.auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own documents" ON public.trip_documents
    FOR DELETE USING (auth.uid() = user_id);

-- Create bucket for documents if not exists (This needs to be done via Supabase dashboard or API, but SQL can hint it)
-- Usually bucket creation is manual or via different API.
