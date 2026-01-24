-- Drop the old restrictive check constraint
ALTER TABLE public.advertisements DROP CONSTRAINT IF EXISTS advertisements_placement_check;

-- Add a new flexible check constraint that allows:
-- - 'weekly_picks' for weekly picks ads
-- - 'spin_popup_all' for pinned ads in "All" category
-- - 'spin_popup_cuisine_*' for pinned ads in specific cuisine categories
ALTER TABLE public.advertisements 
ADD CONSTRAINT advertisements_placement_check 
CHECK (
  placement = 'weekly_picks' 
  OR placement = 'spin_popup_all' 
  OR placement LIKE 'spin_popup_cuisine_%'
);