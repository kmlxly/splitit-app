-- Add destination_currency to trips table
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS destination_currency text DEFAULT 'SGD';
