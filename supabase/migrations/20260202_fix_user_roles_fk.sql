-- Add foreign key relationship to allow PostgREST embedding
-- user_roles.user_id is already a FK to auth.users, but we need it to reference profiles 
-- for the Javascript client to be able to join them easily.

DO $$
BEGIN
    -- Check if constraint exists effectively (we can just try to add it, if it exists it will error, so we wrap in block)
    -- Actually, simpler to just add it if not exists logic, but standard SQL doesn't have "ADD CONSTRAINT IF NOT EXISTS" for FKs easily without a check.
    -- However, we can drop it first to be safe if we want to ensure it's correct.
    
    -- Let's try to add it. Since user_roles.user_id references auth.users, and profiles.id references auth.users (and is PK), 
    -- this ensures referential integrity is maintained across all three.
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_roles_user_id_fkey_profiles' 
        AND table_name = 'user_roles'
    ) THEN
        ALTER TABLE public.user_roles 
        ADD CONSTRAINT user_roles_user_id_fkey_profiles 
        FOREIGN KEY (user_id) 
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
    END IF;
END $$;
