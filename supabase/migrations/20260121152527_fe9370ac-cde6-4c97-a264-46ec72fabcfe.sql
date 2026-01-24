-- Allow anyone to view public profiles (is_private = false)
-- Drop the authenticated-only policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create a new policy that allows:
-- 1. Anyone to view public profiles (is_private = false)
-- 2. Authenticated users to view their own profile
-- 3. Authenticated users to view friends' private profiles
CREATE POLICY "Anyone can view public profiles"
ON public.profiles
FOR SELECT
USING (
  (is_private = false)
  OR (auth.uid() IS NOT NULL AND auth.uid() = id)
  OR (auth.uid() IS NOT NULL AND is_friend(auth.uid(), id))
);