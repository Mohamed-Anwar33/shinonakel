-- Create restaurant_interactions table for tracking all restaurant interactions
CREATE TABLE public.restaurant_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- 'talabat', 'deliveroo', 'jahez', 'keeta', 'location', 'website', 'phone'
  ad_id UUID REFERENCES public.advertisements(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.restaurant_interactions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert interactions (including guests)
CREATE POLICY "Anyone can insert interactions"
ON public.restaurant_interactions
FOR INSERT
WITH CHECK (true);

-- Policy: Admins can view all interactions
CREATE POLICY "Admins can view interactions"
ON public.restaurant_interactions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_restaurant_interactions_restaurant_id ON public.restaurant_interactions(restaurant_id);
CREATE INDEX idx_restaurant_interactions_ad_id ON public.restaurant_interactions(ad_id);
CREATE INDEX idx_restaurant_interactions_created_at ON public.restaurant_interactions(created_at DESC);