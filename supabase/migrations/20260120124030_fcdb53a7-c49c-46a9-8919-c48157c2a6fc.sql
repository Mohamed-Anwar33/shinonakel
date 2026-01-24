-- Drop the duplicate and overly permissive policies
DROP POLICY IF EXISTS "Anyone can record ad interactions" ON public.ad_interactions;
DROP POLICY IF EXISTS "Users can record their own interactions" ON public.ad_interactions;

-- Create a single proper policy for inserting ad interactions
CREATE POLICY "Allow ad interaction tracking" 
ON public.ad_interactions 
FOR INSERT 
WITH CHECK (
  -- Allow if user_id matches authenticated user OR user_id is null (for anonymous tracking)
  (auth.uid() = user_id) OR (user_id IS NULL)
);