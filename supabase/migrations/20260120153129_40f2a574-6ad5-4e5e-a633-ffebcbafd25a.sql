-- Add Google Maps URL field to restaurant branches
ALTER TABLE public.restaurant_branches 
ADD COLUMN IF NOT EXISTS google_maps_url TEXT;