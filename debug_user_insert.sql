-- =====================================================
-- Debug User INSERT Issues
-- =====================================================

-- 1. Check current user and admin status
SELECT 
  auth.uid() as current_user_id,
  public.is_admin(auth.uid()) as is_current_user_admin;

-- 2. Verify service_role exists and has bypass_rls
SELECT 
  rolname,
  rolsuper,
  rolbypassrls,
  rolcanlogin
FROM pg_roles
WHERE rolname = 'service_role';

-- 3. Check all INSERT policies on users table
SELECT 
  policyname,
  cmd,
  roles,
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
AND cmd = 'INSERT'
ORDER BY policyname;

-- 4. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- 5. Test INSERT directly (this should work if service_role has permissions)
-- Replace with actual test data
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_email TEXT := 'test_debug_' || extract(epoch from now())::text || '@test.com';
BEGIN
  INSERT INTO users (
    id,
    email,
    password_hash,
    name,
    status
  ) VALUES (
    test_id,
    test_email,
    '',
    'Test Debug User',
    'active'
  );
  
  RAISE NOTICE 'SUCCESS: Inserted test user with ID: %, Email: %', test_id, test_email;
  
  -- Clean up
  DELETE FROM users WHERE id = test_id;
  RAISE NOTICE 'Test user deleted';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERROR inserting: SQLSTATE=%, SQLERRM=%', SQLSTATE, SQLERRM;
END $$;


