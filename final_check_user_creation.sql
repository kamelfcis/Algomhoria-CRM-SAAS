-- =====================================================
-- Final Check: User Creation Issues
-- =====================================================

-- 1. Verify is_admin function works
SELECT 
  auth.uid() as current_user_id,
  public.is_admin(auth.uid()) as is_current_user_admin;

-- 2. Check if you have admin role
SELECT 
  u.id,
  u.email,
  r.id as role_id,
  r.name as role_name,
  r.status as role_status
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.id = auth.uid()
AND r.name = 'admin'
AND r.status = 'active';

-- 3. Check RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- 4. List all INSERT policies
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
AND cmd = 'INSERT';

-- 5. Check table columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;

-- 6. Test is_admin function with a specific user ID
-- Replace with your actual user ID
SELECT 
  public.is_admin('f84548a1-9fa6-474b-ba29-b9669b7dbf58'::uuid) as your_user_is_admin;

-- 7. Check if user_roles table has data for your user
SELECT 
  ur.user_id,
  ur.role_id,
  r.name as role_name,
  r.status as role_status
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = 'f84548a1-9fa6-474b-ba29-b9669b7dbf58'::uuid;

-- 8. Verify admin role exists
SELECT id, name, status, is_system_role 
FROM roles 
WHERE name = 'admin';

