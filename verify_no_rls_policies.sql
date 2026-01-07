-- =====================================================
-- Verify No RLS Policies on Users Table
-- =====================================================

-- 1. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- 2. Check all policies (should be empty)
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users';

-- 3. If you want to disable RLS completely (not recommended for production)
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 4. Test INSERT (should work now)
-- This is just to verify, don't run if you don't want to create test data
-- INSERT INTO users (id, email, name, password_hash, status)
-- VALUES (
--   gen_random_uuid(),
--   'test_' || extract(epoch from now())::text || '@test.com',
--   'Test User',
--   '',
--   'active'
-- );


