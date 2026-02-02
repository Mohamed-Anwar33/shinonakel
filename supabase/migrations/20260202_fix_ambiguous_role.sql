-- Drop the function first to ensure a clean slate
DROP FUNCTION IF EXISTS public.get_all_profiles_with_email();

-- Create the function with explicit table aliases to avoid ambiguity between output parameters and table columns
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
    -- Check if the caller is an admin using explicit table alias "ur"
    -- This fixes the "column reference role is ambiguous" error
    IF NOT EXISTS (
        SELECT 1 
        FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'admin'
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
        CASE WHEN ur.role = 'admin' THEN TRUE ELSE FALSE END,
        COALESCE(ur.role, 'user')
    FROM public.profiles p
    JOIN auth.users u ON p.id = u.id
    LEFT JOIN public.user_roles ur ON p.id = ur.user_id
    ORDER BY p.created_at DESC;
END;
$$;

-- Grant permissions again just in case
GRANT EXECUTE ON FUNCTION public.get_all_profiles_with_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_profiles_with_email() TO service_role;
