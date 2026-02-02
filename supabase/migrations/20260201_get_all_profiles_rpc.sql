-- Secure RPC to fetch profiles with emails (Admin Only)
-- Joins public.profiles with auth.users to get email addresses

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
SECURITY DEFINER -- Runs with privileges of the creator (postgres) to access auth.users
SET search_path = public, auth
AS $$
BEGIN
  -- Security check: Ensure the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: User is not an admin';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.created_at,
    u.email::VARCHAR,
    CASE WHEN ur.role = 'admin' THEN TRUE ELSE FALSE END as is_admin,
    COALESCE(ur.role, 'user') as role
  FROM public.profiles p
  JOIN auth.users u ON p.id = u.id
  LEFT JOIN public.user_roles ur ON p.id = ur.user_id
  ORDER BY p.created_at DESC;
END;
$$;
