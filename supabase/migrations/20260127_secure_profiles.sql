-- Secure the profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Remove existing potentially insecure policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- 1. VIEW: Authenticated users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 2. VIEW: Authenticated users can view other PUBLIC profiles
-- Assuming is_private defaults to false or users manage it.
CREATE POLICY "Authenticated users can view public profiles"
ON profiles FOR SELECT
TO authenticated
USING (is_private = false);

-- 3. UPDATE: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 4. INSERT: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- NOTIFY:
DO $$
BEGIN
    RAISE NOTICE 'Profiles table secured. Access restricted to Authenticated users.';
END $$;
