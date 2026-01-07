-- =====================================================
-- Verify INSERT Permissions for Users Table
-- =====================================================
-- This checks if the service role can insert into users table

-- 1. Check RLS status
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- 2. Check INSERT policies
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

-- 3. Check if service role has permissions
-- Service role should bypass RLS, but let's verify
SELECT 
  r.rolname,
  has_table_privilege(r.rolname, 'public.users', 'INSERT') as can_insert,
  has_table_privilege(r.rolname, 'public.users', 'SELECT') as can_select,
  has_table_privilege(r.rolname, 'public.users', 'UPDATE') as can_update,
  has_table_privilege(r.rolname, 'public.users', 'DELETE') as can_delete
FROM pg_roles r
WHERE r.rolname IN ('service_role', 'authenticated', 'anon');

-- 4. Check table structure one more time
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;

-- 5. Verify required fields for INSERT
-- These are columns that are NOT NULL and have NO default
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
AND is_nullable = 'NO'
AND (column_default IS NULL OR column_default = '')
ORDER BY column_name;


