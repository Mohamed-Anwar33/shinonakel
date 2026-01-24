-- Add English name column to cuisines table for translations
ALTER TABLE public.cuisines ADD COLUMN IF NOT EXISTS name_en TEXT;

-- Update cuisines with English translations
UPDATE public.cuisines SET name_en = 'All' WHERE name = 'الكل';
UPDATE public.cuisines SET name_en = 'Gulf' WHERE name = 'خليجي';
UPDATE public.cuisines SET name_en = 'Italian' WHERE name = 'إيطالي';
UPDATE public.cuisines SET name_en = 'Japanese' WHERE name = 'ياباني';
UPDATE public.cuisines SET name_en = 'Indian' WHERE name = 'هندي';
UPDATE public.cuisines SET name_en = 'Chinese' WHERE name = 'صيني';
UPDATE public.cuisines SET name_en = 'Mexican' WHERE name = 'مكسيكي';
UPDATE public.cuisines SET name_en = 'Burger' WHERE name = 'برجر';
UPDATE public.cuisines SET name_en = 'Pizza' WHERE name = 'بيتزا';
UPDATE public.cuisines SET name_en = 'Seafood' WHERE name = 'بحري';
UPDATE public.cuisines SET name_en = 'Desserts' WHERE name = 'حلويات';
UPDATE public.cuisines SET name_en = 'Coffee' WHERE name = 'قهوة';
UPDATE public.cuisines SET name_en = 'Pastries' WHERE name = 'معجنات';
UPDATE public.cuisines SET name_en = 'Diet' WHERE name = 'دايت';
UPDATE public.cuisines SET name_en = 'Lebanese' WHERE name = 'لبناني';
UPDATE public.cuisines SET name_en = 'Breakfast' WHERE name = 'فطور';
UPDATE public.cuisines SET name_en = 'Other' WHERE name = 'أخرى';