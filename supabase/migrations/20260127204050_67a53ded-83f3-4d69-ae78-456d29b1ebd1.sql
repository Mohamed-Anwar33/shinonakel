-- Step 1: Drop the old check constraint
ALTER TABLE public.advertisements 
DROP CONSTRAINT IF EXISTS advertisements_placement_check;

-- Step 2: Update existing placement values (while no constraint exists)
UPDATE public.advertisements 
SET placement = 'most_popular' 
WHERE placement = 'weekly_picks';

UPDATE public.advertisements 
SET placement = 'pinned_ad_all' 
WHERE placement = 'spin_popup_all';

UPDATE public.advertisements 
SET placement = REPLACE(placement, 'spin_popup_cuisine_', 'pinned_ad_cuisine_')
WHERE placement LIKE 'spin_popup_cuisine_%';

UPDATE public.advertisements 
SET placement = 'pinned_ad' 
WHERE placement = 'spin_popup';

-- Step 3: Add new check constraint with updated values
ALTER TABLE public.advertisements
ADD CONSTRAINT advertisements_placement_check 
CHECK (
  placement = 'most_popular' OR 
  placement = 'pinned_ad_all' OR 
  placement LIKE 'pinned_ad_cuisine_%' OR
  placement = 'pinned_ad'
);