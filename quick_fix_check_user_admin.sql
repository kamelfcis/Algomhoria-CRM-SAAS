-- =====================================================
-- Quick Fix: Check and Assign Admin Role
-- =====================================================
-- Run this to check if your user has admin role and assign it if needed

-- Step 1: Check current user and their roles
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

-- Step 2: Get admin role ID
SELECT id, name FROM roles WHERE name = 'admin';

-- Step 3: Assign admin role to current user (if not already assigned)
-- Replace 'YOUR_USER_ID' with your actual user ID from Step 1, or use auth.uid()
DO $$
DECLARE
  current_user_id UUID;
  admin_role_id UUID;
  role_exists BOOLEAN;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Get admin role ID
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin' LIMIT 1;
  
  IF admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Admin role not found. Please run the migration script first.';
  END IF;
  
  -- Check if user already has admin role
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = current_user_id 
    AND role_id = admin_role_id
  ) INTO role_exists;
  
  -- Assign admin role if not exists
  IF NOT role_exists THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (current_user_id, admin_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
    
    RAISE NOTICE 'Admin role assigned to user: %', current_user_id;
  ELSE
    RAISE NOTICE 'User already has admin role';
  END IF;
END $$;

-- Step 4: Verify admin role assignment
SELECT 
  u.email,
  r.name as role_name,
  public.is_admin(u.id) as is_admin_check
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.id = auth.uid()
AND r.name = 'admin';

-- Step 5: Test RLS - Try to select users (should work if admin)
SELECT COUNT(*) as user_count FROM users;

