-- RUN THIS SCRIPT IN YOUR SUPABASE SQL EDITOR --

-- Add 'items' column to 'budget_transactions' table to support grouping/bunching
ALTER TABLE public.budget_transactions 
ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;

-- Comment describing the column
COMMENT ON COLUMN public.budget_transactions.items IS 'List of sub-items for grouped transactions (e.g., receipt items)';
