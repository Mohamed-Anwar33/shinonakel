-- Add unique constraint on username column to prevent duplicates
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_unique UNIQUE (username);