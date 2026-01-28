-- 1. Make end_date nullable to support "Views Only" contracts
ALTER TABLE public.advertisements ALTER COLUMN end_date DROP NOT NULL;

-- 2. Update RLS policy to handle NULL end_date
-- If end_date is NULL, the ad is valid indefinitely (as long as views_count < max_views)
DROP POLICY IF EXISTS "Anyone can view active ads" ON public.advertisements;

CREATE POLICY "Anyone can view active ads" 
ON public.advertisements 
FOR SELECT 
TO public
USING (
  is_active = true 
  AND start_date <= CURRENT_DATE 
  AND (end_date IS NULL OR end_date >= CURRENT_DATE)
);

-- 3. Ensure is_deleted exists on restaurants (added for soft-delete)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='restaurants' AND column_name='is_deleted') THEN
    ALTER TABLE public.restaurants ADD COLUMN is_deleted BOOLEAN DEFAULT false NOT NULL;
  END IF;
END $$;
