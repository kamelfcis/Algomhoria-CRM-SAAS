-- =====================================================
-- Assign Default Roles to Users (Safe Migration)
-- =====================================================
-- This script assigns default roles to users who don't have any roles assigned
-- Use this if the role column has already been removed from the users table

-- Check if role column exists, and if not, assign default 'user' role to all users without roles
DO $$
DECLARE
  user_record RECORD;
  role_id UUID;
  user_role_count INTEGER;
  role_column_exists BOOLEAN;
BEGIN
  -- Check if role column exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'role'
  ) INTO role_column_exists;

  IF role_column_exists THEN
    -- Role column exists - migrate from role column
    RAISE NOTICE 'Role column exists. Migrating users from role column...';
    
    FOR user_record IN SELECT id, role FROM users WHERE role IS NOT NULL LOOP
      SELECT id INTO role_id FROM roles WHERE name = user_record.role;
      
      IF role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id)
        VALUES (user_record.id, role_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
      END IF;
    END LOOP;
    
    RAISE NOTICE 'Migration from role column completed.';
  ELSE
    -- Role column doesn't exist - assign default role to users without roles
    RAISE NOTICE 'Role column does not exist. Assigning default roles to users without roles...';
    
    -- Get the 'user' role ID
    SELECT id INTO role_id FROM roles WHERE name = 'user';
    
    IF role_id IS NULL THEN
      RAISE EXCEPTION 'Default role "user" not found. Please create it first.';
    END IF;
    
    -- Assign 'user' role to all users who don't have any roles
    FOR user_record IN SELECT id FROM users LOOP
      -- Check if user has any roles
      SELECT COUNT(*) INTO user_role_count
      FROM user_roles
      WHERE user_id = user_record.id;
      
      -- If user has no roles, assign default 'user' role
      IF user_role_count = 0 THEN
        INSERT INTO user_roles (user_id, role_id)
        VALUES (user_record.id, role_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
        
        RAISE NOTICE 'Assigned default role to user: %', user_record.id;
      END IF;
    END LOOP;
    
    RAISE NOTICE 'Default role assignment completed.';
  END IF;
END $$;

-- =====================================================
-- Verify Results
-- =====================================================
-- Check how many users have roles assigned
SELECT 
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT ur.user_id) as users_with_roles,
  COUNT(DISTINCT u.id) - COUNT(DISTINCT ur.user_id) as users_without_roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id;

-- Show users without roles (if any)
SELECT 
  u.id,
  u.email,
  u.name,
  u.status
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL;

