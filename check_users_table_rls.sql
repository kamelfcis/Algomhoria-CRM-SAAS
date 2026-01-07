-- =====================================================
-- Check Users Table RLS Policies
-- =====================================================
-- Run this to check if RLS is enabled and what policies exist

-- Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Test query (should work if RLS allows)
-- SELECT id, email, name FROM users LIMIT 1;

-- =====================================================
-- Fix: Create/Update RLS Policies for Users Table
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;
DROP POLICY IF EXISTS "Authenticated users can view users" ON users;

-- Policy 1: Users can view their own data
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Users with admin role can view all users
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND r.name = 'admin'
      AND r.status = 'active'
    )
  );

-- Policy 3: Admins can insert users
CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND r.name = 'admin'
      AND r.status = 'active'
    )
  );

-- Policy 4: Admins can update users
CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND r.name = 'admin'
      AND r.status = 'active'
    )
  );

-- Policy 5: Admins can delete users
CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
      AND r.name = 'admin'
      AND r.status = 'active'
    )
  );

-- =====================================================
-- Alternative: Temporary policy to allow all authenticated users to view (for testing)
-- =====================================================
-- Uncomment this if you want to allow all authenticated users to view users temporarily
-- DROP POLICY IF EXISTS "Temporary: All authenticated can view users" ON users;
-- CREATE POLICY "Temporary: All authenticated can view users"
--   ON users FOR SELECT
--   TO authenticated
--   USING (true);

