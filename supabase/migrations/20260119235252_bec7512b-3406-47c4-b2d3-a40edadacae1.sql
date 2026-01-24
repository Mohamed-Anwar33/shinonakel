-- Fix search_path for rating functions
CREATE OR REPLACE FUNCTION public.get_restaurant_avg_rating(restaurant_uuid UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)
  FROM public.restaurant_ratings
  WHERE restaurant_id = restaurant_uuid
$$;

CREATE OR REPLACE FUNCTION public.get_restaurant_rating_count(restaurant_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.restaurant_ratings
  WHERE restaurant_id = restaurant_uuid
$$;