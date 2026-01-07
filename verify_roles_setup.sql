-- =====================================================
-- Verify Roles and Permissions Setup
-- =====================================================
-- Run this to check if everything is set up correctly

-- 1. Check if roles table exists and has data
SELECT 'Roles Table' as check_type, COUNT(*) as count FROM roles;

-- 2. Check if permissions table exists and has data
SELECT 'Permissions Table' as check_type, COUNT(*) as count FROM permissions;

-- 3. Check if role_permissions table exists
SELECT 'Role Permissions Table' as check_type, COUNT(*) as count FROM role_permissions;

-- 4. Check if user_roles table exists
SELECT 'User Roles Table' as check_type, COUNT(*) as count FROM user_roles;

-- 5. List all roles
SELECT id, name, name_ar, status, is_system_role FROM roles ORDER BY name;

-- 6. Check users without roles
SELECT 
  u.id,
  u.email,
  u.name,
  COUNT(ur.role_id) as role_count
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
GROUP BY u.id, u.email, u.name
HAVING COUNT(ur.role_id) = 0;

-- 7. Check if is_admin function exists
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc 
WHERE proname IN ('is_admin', 'is_user_admin');

-- 8. Check RLS policies on users table
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

