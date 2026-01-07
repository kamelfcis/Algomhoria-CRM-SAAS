-- =====================================================
-- Verify RLS Policies and Test User Insert
-- =====================================================

-- 1. Check current user and admin status
SELECT 
  u.id,
  u.email,
  r.name as role_name,
  r.status as role_status,
  public.is_admin(u.id) as is_admin_check
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.id = auth.uid();

-- 2. Test is_admin function
SELECT 
  auth.uid() as current_user_id,
  public.is_admin(auth.uid()) as is_current_user_admin;

-- 3. Check all RLS policies on users table
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
ORDER BY cmd, policyname;

-- 4. Check if we can select users (should work if admin)
SELECT COUNT(*) as total_users FROM users;

-- 5. Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
AND column_name IN ('id', 'email', 'name', 'phone_number', 'password_hash', 'status', 'created_at', 'updated_at', 'author_image_url')
ORDER BY ordinal_position;

-- 6. Verify is_admin function definition
SELECT 
  proname,
  prosrc,
  proisstrict,
  prosecdef
FROM pg_proc 
WHERE proname = 'is_admin';

-- 7. Check if user_roles table is accessible
SELECT COUNT(*) as user_role_count FROM user_roles;

-- 8. Check if roles table has admin role
SELECT id, name, status FROM roles WHERE name = 'admin';

