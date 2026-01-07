-- =====================================================
-- Complete Fix: RLS Policies for Service Role
-- =====================================================
-- This script ensures service_role can bypass RLS
-- and adds explicit policies for safety

-- Step 1: Update is_admin function to handle NULL (service role case)
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

-- Grant execute permissions to all roles
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO service_role;

-- Step 2: Drop existing service_role policies if they exist
DROP POLICY IF EXISTS "service_role_can_insert_users" ON users;
DROP POLICY IF EXISTS "service_role_can_select_users" ON users;
DROP POLICY IF EXISTS "service_role_can_update_users" ON users;
DROP POLICY IF EXISTS "service_role_can_delete_users" ON users;

-- Step 3: Create explicit policies for service_role
-- Note: Service role SHOULD bypass RLS automatically,
-- but these policies ensure it works even if there's an issue

CREATE POLICY "service_role_can_insert_users" ON users FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "service_role_can_select_users" ON users FOR SELECT
TO service_role
USING (true);

CREATE POLICY "service_role_can_update_users" ON users FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_can_delete_users" ON users FOR DELETE
TO service_role
USING (true);

-- Step 4: Verify service_role has bypass_rls privilege
-- This should return rolbypassrls = true
SELECT 
  rolname,
  rolsuper,
  rolbypassrls,
  rolcanlogin
FROM pg_roles
WHERE rolname = 'service_role';

-- Step 5: Verify all policies
SELECT 
  policyname,
  cmd,
  roles,
  CASE 
    WHEN qual IS NULL THEN 'NULL'
    ELSE substring(qual::text, 1, 60)
  END as qual_preview,
  CASE 
    WHEN with_check IS NULL THEN 'NULL'
    ELSE substring(with_check::text, 1, 60)
  END as with_check_preview
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- Step 6: Test note
-- After running this script, service_role should be able to:
-- 1. Insert users (via adminClient)
-- 2. Select users
-- 3. Update users
-- 4. Delete users
-- All without RLS restrictions


