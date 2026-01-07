-- =====================================================
-- Fix RLS Policies to Use is_admin() Function
-- =====================================================
-- The current policies use direct joins which can cause issues
-- This script updates them to use the is_admin() function instead

-- Step 1: Ensure is_admin function exists and is correct
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
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
    WHERE ur.user_id = p_user_id 
    AND r.name = 'admin'
    AND r.status = 'active'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon;

-- Step 2: Drop existing policies
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "users_select_all_admin" ON users;
DROP POLICY IF EXISTS "users_insert_admin" ON users;
DROP POLICY IF EXISTS "users_update_all_admin" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;

-- Step 3: Recreate policies using the function (no recursion!)

-- Policy 1: Users can view their own data
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;

CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy 2: Admins can view all users
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Policy 3: Admins can insert users (with WITH CHECK)
CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- Policy 4: Users can update their own data
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy 5: Admins can update all users
CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Policy 6: Admins can delete users
CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Step 4: Optional - Remove temporary policy if you want stricter access
-- Uncomment the next line to remove the temp policy:
-- DROP POLICY IF EXISTS "users_select_all_temp" ON users;

-- Step 5: Verify the policies
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NULL THEN 'NULL'
    ELSE substring(qual::text, 1, 80)
  END as qual_preview,
  CASE 
    WHEN with_check IS NULL THEN 'NULL'
    ELSE substring(with_check::text, 1, 80)
  END as with_check_preview
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Step 6: Test the function
-- This should return true/false without errors:
-- SELECT public.is_admin(auth.uid());

