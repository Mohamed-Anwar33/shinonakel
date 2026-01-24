-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can record interactions" ON public.ad_interactions;

-- Create new policy that allows anyone to record interactions (including anonymous users)
CREATE POLICY "Anyone can record ad interactions" 
ON public.ad_interactions 
FOR INSERT 
WITH CHECK (true);

-- Also allow logged-in users to insert with their user_id
CREATE POLICY "Users can record their own interactions" 
ON public.ad_interactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);