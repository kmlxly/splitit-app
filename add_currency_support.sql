-- Add currency columns to trip_items
ALTER TABLE public.trip_items 
ADD COLUMN original_currency text DEFAULT 'MYR',
ADD COLUMN original_amount numeric DEFAULT 0,
ADD COLUMN exchange_rate numeric DEFAULT 1;

-- Add currency columns to trip_personal_expenses
ALTER TABLE public.trip_personal_expenses 
ADD COLUMN original_currency text DEFAULT 'MYR',
ADD COLUMN original_amount numeric DEFAULT 0,
ADD COLUMN exchange_rate numeric DEFAULT 1;
