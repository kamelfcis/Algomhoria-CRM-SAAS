-- =====================================================
-- Check Users Table RLS Policies for INSERT
-- =====================================================
-- This script checks if INSERT operations are allowed on the users table

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
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users'
AND cmd = 'INSERT'
ORDER BY policyname;

-- 3. Check if is_admin function works
SELECT 
  proname,
  prosrc
FROM pg_proc 
WHERE proname = 'is_admin';

-- 4. Test INSERT with admin client (this should work)
-- Note: This will only work if you're using service role key
-- SELECT public.is_admin('YOUR_USER_ID'::uuid);

-- 5. Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;

-- 6. Check for required columns
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id') THEN 'id: EXISTS'
    ELSE 'id: MISSING'
  END,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN 'email: EXISTS'
    ELSE 'email: MISSING'
  END,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'name') THEN 'name: EXISTS'
    ELSE 'name: MISSING'
  END,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone_number') THEN 'phone_number: EXISTS'
    ELSE 'phone_number: MISSING'
  END,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN 'password_hash: EXISTS'
    ELSE 'password_hash: MISSING'
  END,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status') THEN 'status: EXISTS'
    ELSE 'status: MISSING'
  END;

