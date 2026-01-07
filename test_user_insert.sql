-- =====================================================
-- Test User Insert - Check if INSERT works
-- =====================================================

-- 1. Check current user and admin status
SELECT 
  u.id,
  u.email,
  r.name as role_name,
  public.is_admin(u.id) as is_admin_check
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.id = auth.uid();

-- 2. Check RLS on users table
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- 3. Check INSERT policies
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users'
AND cmd = 'INSERT'
ORDER BY policyname;

-- 4. Test if is_admin function works
SELECT public.is_admin(auth.uid()) as current_user_is_admin;

-- 5. Check if we can select from users (to verify RLS)
SELECT COUNT(*) as user_count FROM users;

-- 6. Try to insert a test user (this might fail, but we'll see the error)
-- Note: Replace with a test UUID
/*
DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  INSERT INTO users (id, email, name, phone_number, password_hash, status)
  VALUES (test_user_id, 'test@example.com', 'Test User', NULL, '', 'active');
  
  RAISE NOTICE 'Test insert successful';
  
  -- Clean up
  DELETE FROM users WHERE id = test_user_id;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error: %', SQLERRM;
END $$;
*/

