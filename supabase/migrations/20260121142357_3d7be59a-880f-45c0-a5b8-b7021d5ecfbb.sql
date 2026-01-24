-- Drop existing SELECT policy on profiles
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create new policy that allows public (anonymous) access to view profiles
CREATE POLICY "Anyone can view profiles" 
ON public.profiles 
FOR SELECT 
TO public
USING (
  (is_private = false) 
  OR (auth.uid() = id) 
  OR is_friend(auth.uid(), id)
);