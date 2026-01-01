-- ============================================================================
-- Sync Users from auth.users to public.users
-- ============================================================================
-- This script will:
-- 1. Create a trigger to automatically sync new users
-- 2. Sync existing users from auth.users to public.users
-- ============================================================================

-- Step 1: Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, password_hash, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    '', -- Password is handled by Supabase Auth
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'), -- Use name from metadata or email as fallback
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')::text, -- Use role from metadata or default to 'user'
    'active'
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if user already exists
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Sync existing users from auth.users to public.users
-- This will insert any users that exist in auth.users but not in public.users
INSERT INTO public.users (id, email, password_hash, name, role, status)
SELECT 
  au.id,
  au.email,
  '', -- Password is handled by Supabase Auth
  COALESCE(au.raw_user_meta_data->>'name', au.email, 'User') as name,
  COALESCE(au.raw_user_meta_data->>'role', 'user')::text as role,
  'active' as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL -- Only insert users that don't exist in public.users
ON CONFLICT (id) DO NOTHING;

-- Step 4: Update existing users' email if it changed in auth.users
UPDATE public.users pu
SET email = au.email
FROM auth.users au
WHERE pu.id = au.id AND pu.email != au.email;

-- ============================================================================
-- Verification Query - Check if all auth users have corresponding records
-- ============================================================================
-- Run this to verify sync:
-- SELECT 
--   au.id,
--   au.email,
--   au.created_at as auth_created_at,
--   pu.id as user_table_id,
--   pu.name,
--   pu.role,
--   pu.status
-- FROM auth.users au
-- LEFT JOIN public.users pu ON au.id = pu.id
-- ORDER BY au.created_at DESC;

