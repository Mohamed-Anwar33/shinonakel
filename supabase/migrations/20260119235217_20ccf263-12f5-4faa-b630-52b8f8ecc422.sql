-- Create restaurant ratings table
CREATE TABLE public.restaurant_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, user_id)
);

-- Enable RLS
ALTER TABLE public.restaurant_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can view ratings
CREATE POLICY "Anyone can view ratings"
ON public.restaurant_ratings
FOR SELECT
USING (true);

-- Users can add their own ratings
CREATE POLICY "Users can add their own ratings"
ON public.restaurant_ratings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own ratings
CREATE POLICY "Users can update their own ratings"
ON public.restaurant_ratings
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own ratings
CREATE POLICY "Users can delete their own ratings"
ON public.restaurant_ratings
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to get average rating for a restaurant
CREATE OR REPLACE FUNCTION public.get_restaurant_avg_rating(restaurant_uuid UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)
  FROM public.restaurant_ratings
  WHERE restaurant_id = restaurant_uuid
$$;

-- Create function to get rating count for a restaurant
CREATE OR REPLACE FUNCTION public.get_restaurant_rating_count(restaurant_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM public.restaurant_ratings
  WHERE restaurant_id = restaurant_uuid
$$;

-- Trigger for updated_at
CREATE TRIGGER update_restaurant_ratings_updated_at
BEFORE UPDATE ON public.restaurant_ratings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();