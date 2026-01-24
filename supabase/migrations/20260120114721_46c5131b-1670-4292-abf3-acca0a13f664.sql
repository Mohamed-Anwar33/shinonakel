-- Create cuisines table
CREATE TABLE public.cuisines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  emoji TEXT NOT NULL DEFAULT '🍴',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cuisines ENABLE ROW LEVEL SECURITY;

-- Anyone can view active cuisines
CREATE POLICY "Anyone can view active cuisines"
ON public.cuisines
FOR SELECT
USING (is_active = true);

-- Admins can manage cuisines
CREATE POLICY "Admins can manage cuisines"
ON public.cuisines
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default cuisines
INSERT INTO public.cuisines (name, emoji, sort_order) VALUES
  ('الكل', '🍽️', 0),
  ('مأكولات سعودية', '🥘', 1),
  ('مأكولات إيطالية', '🍕', 2),
  ('مأكولات يابانية', '🍱', 3),
  ('مأكولات هندية', '🍛', 4),
  ('مأكولات صينية', '🥡', 5),
  ('مأكولات مكسيكية', '🌮', 6),
  ('برجر', '🍔', 7),
  ('بيتزا', '🍕', 8),
  ('مأكولات بحرية', '🦐', 9),
  ('حلويات', '🍰', 10),
  ('قهوة', '☕', 11),
  ('أخرى', '🍴', 99);