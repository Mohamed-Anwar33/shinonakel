-- Add cuisines array column to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN cuisines text[] DEFAULT ARRAY[]::text[];

-- Migrate existing single cuisine data to the new array column
UPDATE public.restaurants 
SET cuisines = ARRAY[cuisine]
WHERE cuisine IS NOT NULL AND cuisine != '';

-- Note: We keep the old 'cuisine' column for backward compatibility
-- It can be removed later after all code is updated