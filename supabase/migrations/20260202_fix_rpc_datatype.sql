-- Drop the function to reset
DROP FUNCTION IF EXISTS public.get_all_profiles_with_email();

-- Recreate with explicit casting for the role enum
CREATE OR REPLACE FUNCTION public.get_all_profiles_with_email()
RETURNS TABLE (
    id UUID,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    email VARCHAR,
    is_admin BOOLEAN,
    role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Permission check
    IF NOT EXISTS (
        SELECT 1 
        FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role::text = 'admin'  -- Cast to text for comparison just in case
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT 
        p.id, 
        p.username, 
        p.full_name, 
        p.avatar_url, 
        p.created_at,
        COALESCE(u.email, '')::VARCHAR,
        CASE WHEN ur.role::text = 'admin' THEN TRUE ELSE FALSE END, -- Cast to text
        COALESCE(ur.role::text, 'user') -- Cast enum to text to match RETURNS TABLE definition
    FROM public.profiles p
    JOIN auth.users u ON p.id = u.id
    LEFT JOIN public.user_roles ur ON p.id = ur.user_id
    ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_profiles_with_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_profiles_with_email() TO service_role;
