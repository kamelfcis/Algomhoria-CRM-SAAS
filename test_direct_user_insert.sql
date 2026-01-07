-- =====================================================
-- Test Direct User Insert (Bypassing RLS)
-- =====================================================
-- This tests if we can insert a user directly
-- Run this in Supabase SQL Editor

-- First, check if we can insert using service role (requires disabling RLS temporarily)
-- OR test with current user's admin status

-- 1. Check current user admin status
SELECT 
  auth.uid() as current_user_id,
  public.is_admin(auth.uid()) as is_admin;

-- 2. Check table structure and constraints
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;

-- 3. Check NOT NULL constraints
SELECT 
  column_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
AND is_nullable = 'NO'
AND column_default IS NULL
ORDER BY column_name;

-- 4. Try to insert a test user (this should work if you're admin)
-- WARNING: This will create a test user. Delete it after testing!
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test_' || extract(epoch from now())::text || '@test.com';
BEGIN
  -- Try inserting a test user
  INSERT INTO users (
    id,
    email,
    name,
    password_hash,
    status
  ) VALUES (
    test_user_id,
    test_email,
    'Test User',
    '',
    'active'
  );
  
  RAISE NOTICE 'Successfully inserted test user: %', test_email;
  
  -- Clean up: delete the test user
  DELETE FROM users WHERE id = test_user_id;
  RAISE NOTICE 'Test user deleted';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error inserting user: % - %', SQLSTATE, SQLERRM;
END $$;

-- 5. Check RLS policies one more time
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
AND cmd = 'INSERT';


