-- Fix 1: Restaurant Images Storage - Restrict to admins only
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Admins can upload restaurant images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete restaurant images" ON storage.objects;

-- Create new policies with proper admin role check
CREATE POLICY "Admins can upload restaurant images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'restaurant-images' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete restaurant images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'restaurant-images'
  AND public.has_role(auth.uid(), 'admin')
);

-- Fix 2: User Profiles - Require authentication to view profiles
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (is_private = false) 
  OR (auth.uid() = id) 
  OR is_friend(auth.uid(), id)
);