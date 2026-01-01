-- ============================================================================
-- Check User Status - Diagnostic Query
-- ============================================================================
-- Run this to check if your user exists in both auth.users and public.users
-- ============================================================================

-- Check all auth users and their corresponding records in users table
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  au.created_at as auth_created_at,
  au.email_confirmed_at,
  pu.id as user_table_id,
  pu.name,
  pu.role,
  pu.status,
  pu.created_at as user_table_created_at,
  CASE 
    WHEN pu.id IS NULL THEN '❌ Missing in users table'
    WHEN pu.role IS NULL THEN '⚠️ Role not set'
    WHEN pu.status != 'active' THEN '⚠️ Status is ' || pu.status
    ELSE '✅ OK'
  END as status_check
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC;

-- Check specific user by email (replace with your email)
-- SELECT 
--   au.id as auth_id,
--   au.email,
--   au.created_at as auth_created_at,
--   pu.id as user_table_id,
--   pu.name,
--   pu.role,
--   pu.status
-- FROM auth.users au
-- LEFT JOIN public.users pu ON au.id = pu.id
-- WHERE au.email = 'your-email@example.com';

