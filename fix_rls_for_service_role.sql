-- =====================================================
-- Fix RLS Policies to Allow Service Role (Bypass)
-- =====================================================
-- Service role should bypass RLS automatically,
-- but we'll add explicit policies just in case

-- Step 1: Ensure is_admin function exists and works
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Return false if user_id is null (service role case)
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
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
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO service_role;

-- Step 2: Add policies that explicitly allow service_role
-- Service role should bypass RLS, but adding explicit policies ensures it works

-- Policy for service_role to INSERT (this should bypass RLS, but adding for safety)
CREATE POLICY IF NOT EXISTS "service_role_can_insert_users" ON users FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy for service_role to SELECT
CREATE POLICY IF NOT EXISTS "service_role_can_select_users" ON users FOR SELECT
TO service_role
USING (true);

-- Policy for service_role to UPDATE
CREATE POLICY IF NOT EXISTS "service_role_can_update_users" ON users FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Policy for service_role to DELETE
CREATE POLICY IF NOT EXISTS "service_role_can_delete_users" ON users FOR DELETE
TO service_role
USING (true);

-- Step 3: Verify current user policies still work for authenticated users
-- (Keep existing policies for authenticated users)

-- Step 4: Verify service_role exists
SELECT 
  rolname,
  rolsuper,
  rolbypassrls,
  rolcanlogin
FROM pg_roles
WHERE rolname = 'service_role';

-- Step 5: List all policies on users table
SELECT 
  policyname,
  cmd,
  roles,
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


