-- Allow public access to profiles (needed for sharing links)
-- This allows anyone (including anonymous users) to view public profiles

-- Drop the existing authenticated-only policy
DROP POLICY IF EXISTS "Authenticated users can view public profiles" ON profiles;

-- Create a new policy that allows everyone to view public profiles
CREATE POLICY "Anyone can view public profiles"
ON profiles FOR SELECT
USING (is_private = false);

-- Notify
DO $$
BEGIN
    RAISE NOTICE 'Updated profiles policy to allow public access to non-private profiles.';
END $$;
