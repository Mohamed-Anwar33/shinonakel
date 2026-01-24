-- Drop the existing permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view public profiles" ON public.profiles;

-- Create new policy that requires authentication to view profiles
CREATE POLICY "Authenticated users can view profiles based on privacy"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Owner can always view their own profile
  auth.uid() = id
  OR
  -- Public profiles are viewable by authenticated users
  is_private = false
  OR
  -- Friends can view private profiles
  public.is_friend(auth.uid(), id)
);