-- ADD IS_COMPLETED COLUMN TO TRIP_ITEMS
ALTER TABLE public.trip_items ADD COLUMN is_completed boolean DEFAULT false;
