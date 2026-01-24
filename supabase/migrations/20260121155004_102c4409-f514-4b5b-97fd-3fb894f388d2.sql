-- Fix can_view_restaurants to properly handle unauthenticated users viewing public profiles
CREATE OR REPLACE FUNCTION public.can_view_restaurants(owner_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    -- If profile is public, anyone can view (check this first - no auth required)
    NOT COALESCE((SELECT is_private FROM public.profiles WHERE id = owner_id), true)
    OR
    -- Owner can always view their own restaurants (only if authenticated)
    (auth.uid() IS NOT NULL AND auth.uid() = owner_id)
    OR
    -- Friends can view (only if authenticated)
    (auth.uid() IS NOT NULL AND public.is_friend(auth.uid(), owner_id))
$function$;