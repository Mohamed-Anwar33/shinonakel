-- Add foreign key relationship between restaurant_ratings and profiles
ALTER TABLE public.restaurant_ratings
ADD CONSTRAINT restaurant_ratings_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;