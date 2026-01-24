-- Ensure profiles are always public by default (no private mode)
UPDATE public.profiles
SET is_private = false
WHERE is_private IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN is_private SET DEFAULT false;

-- Make the column non-null to avoid COALESCE/NULL logic issues
ALTER TABLE public.profiles
  ALTER COLUMN is_private SET NOT NULL;