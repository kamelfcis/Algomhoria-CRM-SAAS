-- =====================================================
-- Fix Users Table RLS Policies to Use user_roles
-- =====================================================
-- This script updates RLS policies to work with the new user_roles system
-- Run this in Supabase SQL Editor

-- Step 1: Drop existing policies that reference the role column
DROP POLICY IF EXISTS "users_select_all_admin" ON users;
DROP POLICY IF EXISTS "users_insert_admin" ON users;
DROP POLICY IF EXISTS "users_update_all_admin" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

-- Step 2: Create or replace security definer function to check if user is admin
-- This function bypasses RLS to avoid recursion
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_id 
    AND r.name = 'admin'
    AND r.status = 'active'
  );
END;
$$;

-- Also create is_user_admin as an alias (same function)
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_id 
    AND r.name = 'admin'
    AND r.status = 'active'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.is_user_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin(UUID) TO anon;

-- Step 3: Recreate policies using the new function

-- Policy 1: Users can view their own data
CREATE POLICY "users_select_own" ON users FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy 2: Admins can view all users
CREATE POLICY "users_select_all_admin" ON users FOR SELECT
TO authenticated
USING (public.is_user_admin(auth.uid()));

-- Policy 3: Admins can insert users
CREATE POLICY "users_insert_admin" ON users FOR INSERT
TO authenticated
WITH CHECK (public.is_user_admin(auth.uid()));

-- Policy 4: Users can update their own data (limited fields)
CREATE POLICY "users_update_own" ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy 5: Admins can update all users
CREATE POLICY "users_update_all_admin" ON users FOR UPDATE
TO authenticated
USING (public.is_user_admin(auth.uid()))
WITH CHECK (public.is_user_admin(auth.uid()));

-- Policy 6: Admins can delete users
CREATE POLICY "users_delete_admin" ON users FOR DELETE
TO authenticated
USING (public.is_user_admin(auth.uid()));

-- =====================================================
-- Alternative: Temporary policy to allow all authenticated users (for testing)
-- =====================================================
-- Uncomment the following if you want to temporarily allow all authenticated users to view users
-- This is useful for testing, but should be removed in production

-- DROP POLICY IF EXISTS "users_select_all_temp" ON users;
-- CREATE POLICY "users_select_all_temp" ON users FOR SELECT
-- TO authenticated
-- USING (true);

-- =====================================================
-- Verify the policies
-- =====================================================
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

