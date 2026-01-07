-- =====================================================
-- Test INSERT with Service Role (Bypass RLS)
-- =====================================================
-- This should be run using the service role key directly
-- Or check if RLS is actually blocking service role

-- 1. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- 2. Check current role
SELECT current_user, session_user;

-- 3. Test INSERT (this should work if RLS is bypassed for service_role)
-- WARNING: This creates a test user - delete after testing!
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_email TEXT := 'test_service_role_' || extract(epoch from now())::text || '@test.com';
  insert_result TEXT;
BEGIN
  -- Try inserting with explicit fields matching our API code
  INSERT INTO users (
    id,
    email,
    name,
    password_hash,
    status
  ) VALUES (
    test_id,
    test_email,
    'Test Service Role User',
    '',  -- Empty string like in our API
    'active'
  );
  
  RAISE NOTICE 'SUCCESS: Inserted test user with ID: %, Email: %', test_id, test_email;
  
  -- Clean up
  DELETE FROM users WHERE id = test_id;
  RAISE NOTICE 'Test user deleted successfully';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERROR: % - %', SQLSTATE, SQLERRM;
  RAISE NOTICE 'This suggests RLS or permission issue if running with service_role';
END $$;

-- 4. Check if service_role exists and has proper permissions
SELECT 
  rolname,
  rolsuper,
  rolbypassrls,
  rolcanlogin
FROM pg_roles
WHERE rolname = 'service_role';

-- 5. Verify RLS policies allow service_role (though service_role should bypass)
-- Service role should bypass RLS automatically, but let's verify policies
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
AND cmd = 'INSERT';


