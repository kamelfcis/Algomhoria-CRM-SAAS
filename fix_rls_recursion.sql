-- ============================================================================
-- Fix Infinite Recursion in RLS Policies for users table
-- ============================================================================
-- Problem: Policies check users table while querying users table = infinite loop
-- Solution: Use security definer function to check roles without RLS
-- ============================================================================

-- Step 1: Create a security definer function to check if user is admin
-- This function bypasses RLS to avoid recursion
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$;

-- Step 2: Drop existing problematic policies
DROP POLICY IF EXISTS "users_select_all_admin" ON users;
DROP POLICY IF EXISTS "users_insert_admin" ON users;
DROP POLICY IF EXISTS "users_update_all_admin" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;

-- Step 3: Recreate policies using the function (no recursion!)
CREATE POLICY "users_select_all_admin" ON users FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "users_insert_admin" ON users FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "users_update_all_admin" ON users FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "users_delete_admin" ON users FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Step 4: Fix other tables that have the same issue
-- Team users policies
DROP POLICY IF EXISTS "team_users_select_all_admin" ON team_users;
DROP POLICY IF EXISTS "team_users_insert_admin" ON team_users;
DROP POLICY IF EXISTS "team_users_update_admin" ON team_users;
DROP POLICY IF EXISTS "team_users_delete_admin" ON team_users;

CREATE POLICY "team_users_select_all_admin" ON team_users FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "team_users_insert_admin" ON team_users FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "team_users_update_admin" ON team_users FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "team_users_delete_admin" ON team_users FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Step 5: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon;

-- ============================================================================
-- Verification
-- ============================================================================
-- Test the function (should return true/false):
-- SELECT public.is_admin(auth.uid());

