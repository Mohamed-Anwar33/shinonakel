-- 1. Auto-Confirm Users (Disable OTP Requirement)
-- Create a function to set email_confirmed_at to NOW()
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email_confirmed_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run this function on new user insertion
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user();

-- Notify
DO $$
BEGIN
    RAISE NOTICE 'Auto-confirm trigger created. OTP disabled for new signups.';
END $$;


-- 2. Secure Profiles Table (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Remove existing potentially insecure policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- VIEW: Authenticated users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- VIEW: Authenticated users can view other PUBLIC profiles
CREATE POLICY "Authenticated users can view public profiles"
ON profiles FOR SELECT
TO authenticated
USING (is_private = false);

-- UPDATE: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- INSERT: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Notify
DO $$
BEGIN
    RAISE NOTICE 'Profiles table secured. Access restricted to Authenticated users.';
END $$;
