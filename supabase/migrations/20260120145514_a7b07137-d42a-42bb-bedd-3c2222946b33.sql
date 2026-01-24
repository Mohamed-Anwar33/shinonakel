-- Change default value of is_private to true for better privacy by default
ALTER TABLE public.profiles 
ALTER COLUMN is_private SET DEFAULT true;