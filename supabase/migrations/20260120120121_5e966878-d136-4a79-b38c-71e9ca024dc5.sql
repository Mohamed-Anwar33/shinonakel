-- Add max_views column for spin_popup ads
ALTER TABLE public.advertisements 
ADD COLUMN max_views INTEGER DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.advertisements.max_views IS 'Maximum number of views for spin_popup ads. NULL means unlimited.';