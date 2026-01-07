# Quick Fix for Users Page Issues

## Problem
Getting 400 errors when trying to view or create users.

## Root Causes
1. **RLS Policies** - Policies are checking the old `role` column which doesn't exist
2. **Missing Roles** - Users don't have roles assigned in `user_roles` table
3. **API Queries** - Some queries still use `select('*')` which tries to access removed columns

## Quick Fix Steps

### Step 1: Fix RLS Policies (CRITICAL)
Run this in Supabase SQL Editor:
```sql
-- File: fix_users_rls_policies.sql
```

This will:
- Update `is_admin()` function to use `user_roles` table
- Fix all RLS policies on users table
- Allow admins to view/manage users

### Step 2: Assign Roles to Existing Users
Run this in Supabase SQL Editor:
```sql
-- File: assign_default_roles_to_users.sql
```

Or run this quick script:
```sql
-- Assign default 'user' role to all users without roles
DO $$
DECLARE
  user_record RECORD;
  role_id UUID;
  user_role_count INTEGER;
BEGIN
  SELECT id INTO role_id FROM roles WHERE name = 'user';
  
  IF role_id IS NULL THEN
    RAISE EXCEPTION 'Default role "user" not found. Please run the migration script first.';
  END IF;
  
  FOR user_record IN SELECT id FROM users LOOP
    SELECT COUNT(*) INTO user_role_count
    FROM user_roles
    WHERE user_id = user_record.id;
    
    IF user_role_count = 0 THEN
      INSERT INTO user_roles (user_id, role_id)
      VALUES (user_record.id, role_id)
      ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;
```

### Step 3: Verify Setup
Run this to check everything:
```sql
-- File: verify_roles_setup.sql
```

### Step 4: Clear Browser Cache
1. Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Or clear browser cache completely

## Expected Results After Fix

✅ Users page should load and show all users
✅ You should be able to create new users
✅ Users should have roles displayed
✅ No more 400 errors

## If Still Having Issues

1. **Check server logs** - Look at the terminal where `npm run dev` is running
2. **Check browser console** - Look for specific error messages
3. **Verify tables exist**:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('users', 'roles', 'user_roles', 'permissions', 'role_permissions');
   ```
4. **Check if you have admin role**:
   ```sql
   SELECT u.email, r.name as role_name
   FROM users u
   JOIN user_roles ur ON u.id = ur.user_id
   JOIN roles r ON ur.role_id = r.id
   WHERE r.name = 'admin';
   ```

## Common Issues

### Issue: "column role does not exist"
**Solution**: Run `fix_users_rls_policies.sql` to update RLS policies

### Issue: "No roles available"
**Solution**: Run `supabase_roles_permissions_migration.sql` to create roles

### Issue: "Unauthorized" or "Forbidden"
**Solution**: Make sure your user has admin role assigned in `user_roles` table

### Issue: Users page shows empty
**Solution**: 
1. Check RLS policies are fixed
2. Verify you have admin role
3. Check browser console for specific errors

