-- Rename and ensure the policy explicitly allows anon users to view public profile restaurants
DROP POLICY IF EXISTS "Authenticated users can view restaurants based on privacy" ON public.saved_restaurants;

CREATE POLICY "Anyone can view restaurants based on privacy settings"
ON public.saved_restaurants
FOR SELECT
USING (
  (auth.uid() = user_id) 
  OR can_view_restaurants(user_id)
);