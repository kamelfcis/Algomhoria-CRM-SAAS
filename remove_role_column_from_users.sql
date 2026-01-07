-- =====================================================
-- Remove role column from users table
-- =====================================================
-- IMPORTANT: Only run this AFTER verifying that:
-- 1. All users have been migrated to user_roles table
-- 2. The new permission system is working correctly
-- 3. You have a backup of your database

-- Check if all users have roles assigned
-- Run this query first to verify:
-- SELECT u.id, u.email, u.role, COUNT(ur.role_id) as assigned_roles
-- FROM users u
-- LEFT JOIN user_roles ur ON u.id = ur.user_id
-- GROUP BY u.id, u.email, u.role
-- HAVING COUNT(ur.role_id) = 0;

-- If the above query returns any rows, those users need roles assigned first!

-- Remove role column and index
ALTER TABLE users DROP COLUMN IF EXISTS role;
DROP INDEX IF EXISTS idx_users_role;

-- Note: The enum type user_role will remain in the database but won't be used
-- You can drop it if you want:
-- DROP TYPE IF EXISTS user_role;

