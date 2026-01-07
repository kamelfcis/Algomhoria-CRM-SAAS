-- =====================================================
-- Diagnose API Errors - Check Current State
-- =====================================================

-- 1. Check if current user has admin role
SELECT 
  u.id,
  u.email,
  u.name,
  r.name as role_name,
  r.status as role_status
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.id = auth.uid();

-- 2. Check if is_admin function works
SELECT public.is_admin(auth.uid()) as is_current_user_admin;

-- 3. Check if roles table has data
SELECT COUNT(*) as role_count FROM roles;
SELECT id, name, status FROM roles ORDER BY name;

-- 4. Check if user_roles has data
SELECT COUNT(*) as user_role_count FROM user_roles;
SELECT 
  u.email,
  r.name as role_name
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
ORDER BY u.email, r.name;

-- 5. Check RLS policies on users table
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NULL THEN 'NULL'
    ELSE substring(qual::text, 1, 100)
  END as qual_preview
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- 6. Check if role_permissions table exists and has data
SELECT COUNT(*) as role_permission_count FROM role_permissions;

-- 7. Test query that should work (if RLS allows)
SELECT id, email, name FROM users LIMIT 5;

