-- Drop existing SELECT policies that are restricted to authenticated users
DROP POLICY IF EXISTS "Anyone can view restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Anyone can view branches" ON public.restaurant_branches;
DROP POLICY IF EXISTS "Anyone can view delivery apps" ON public.restaurant_delivery_apps;
DROP POLICY IF EXISTS "Anyone can view active ads" ON public.advertisements;

-- Create new SELECT policies that allow public (anonymous) access
CREATE POLICY "Anyone can view restaurants" 
ON public.restaurants 
FOR SELECT 
TO public
USING (true);

CREATE POLICY "Anyone can view branches" 
ON public.restaurant_branches 
FOR SELECT 
TO public
USING (true);

CREATE POLICY "Anyone can view delivery apps" 
ON public.restaurant_delivery_apps 
FOR SELECT 
TO public
USING (true);

CREATE POLICY "Anyone can view active ads" 
ON public.advertisements 
FOR SELECT 
TO public
USING (is_active = true AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE);