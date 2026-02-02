-- Add restaurant_id column to saved_restaurants with FK and CASCADE DELETE
ALTER TABLE public.saved_restaurants
ADD COLUMN restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;