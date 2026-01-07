-- =====================================================
-- Verify and Fix RLS Policies for Users Table
-- =====================================================
-- Based on the current policies shown, let's verify and fix them

-- Step 1: Check current policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Step 2: Ensure is_admin function exists and works with user_roles
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
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

-- Step 3: Fix INSERT policy (it should have WITH CHECK clause)
DROP POLICY IF EXISTS "Admins can insert users" ON users;

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- Step 4: Verify all policies are correct
-- The policies should use is_admin() function, not direct joins

DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;

-- Recreate with proper function calls
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Step 5: Remove temporary policy if no longer needed
-- Uncomment the next line if you want to remove the temp policy
-- DROP POLICY IF EXISTS "users_select_all_temp" ON users;

-- Step 6: Verify final state
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NULL THEN 'NULL'
    ELSE substring(qual::text, 1, 100)
  END as qual_preview,
  CASE 
    WHEN with_check IS NULL THEN 'NULL'
    ELSE substring(with_check::text, 1, 100)
  END as with_check_preview
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

