-- Update the can_view_restaurants function to properly handle public profiles
-- even when the viewer is not logged in
CREATE OR REPLACE FUNCTION public.can_view_restaurants(owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- If profile is public, anyone can view (check this first)
    NOT COALESCE((SELECT is_private FROM public.profiles WHERE id = owner_id), true)
    OR
    -- Owner can always view their own restaurants
    (auth.uid() IS NOT NULL AND auth.uid() = owner_id)
    OR
    -- Friends can view
    (auth.uid() IS NOT NULL AND public.is_friend(auth.uid(), owner_id))
$$;