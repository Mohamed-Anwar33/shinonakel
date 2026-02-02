-- Create a function to allow admins to delete users
-- This functionality requires access to the auth schema, so it must be security definer
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Check if the caller is an admin
  IF NOT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role::text = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can delete users';
  END IF;

  -- Delete the user from auth.users (this will cascade to profiles and other tables)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Grant execute permission to authenticated users (the function itself checks for admin role)
GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(UUID) TO authenticated;
