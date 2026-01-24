-- Update saved_restaurants SELECT policy to require authentication and friendship/ownership
DROP POLICY IF EXISTS "Users can view restaurants based on privacy" ON public.saved_restaurants;

-- Create new restrictive policy that requires authentication
CREATE POLICY "Authenticated users can view restaurants based on privacy"
ON public.saved_restaurants
FOR SELECT
TO authenticated
USING (
  -- Owner can always view their own restaurants
  auth.uid() = user_id
  OR
  -- Non-owners can view if the profile is public or they are friends
  public.can_view_restaurants(user_id)
);

-- Update profiles SELECT policy to require authentication for all access
DROP POLICY IF EXISTS "Authenticated users can view profiles based on privacy" ON public.profiles;

-- Create policy that requires authentication for all profile access
CREATE POLICY "Authenticated users can view profiles"
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