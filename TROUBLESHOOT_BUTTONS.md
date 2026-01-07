# Troubleshooting: Buttons Not Showing in Users Page

## Problem
The "Add User" button and action buttons (Edit, Delete, Reset Password) are not showing in the users page.

## Root Causes

### 1. User Doesn't Have Admin Role
The most common cause is that your user doesn't have the `admin` role assigned in the `user_roles` table.

**Solution:**
Run this SQL in Supabase SQL Editor:
```sql
-- Check your current user ID
SELECT id, email FROM users WHERE email = 'your-email@example.com';

-- Assign admin role (replace YOUR_USER_ID with your actual user ID)
INSERT INTO user_roles (user_id, role_id)
SELECT 
  'YOUR_USER_ID'::uuid,
  id
FROM roles 
WHERE name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;
```

Or use the quick fix script:
```sql
-- File: quick_fix_check_user_admin.sql
```

### 2. Profile ID is Missing
If `profile?.id` is `undefined`, the admin check won't work.

**Check:**
- Open browser console (F12)
- Look for the debug log: `User permissions: { profileId: ..., isUserAdmin: ..., ... }`
- If `profileId` is `undefined`, you need to log in again

**Solution:**
1. Log out and log in again
2. Check if the profile is being set correctly in the auth store

### 3. isAdmin() Function Failing
The `isAdmin()` function might be failing silently.

**Check:**
- Open browser console
- Look for errors related to `isAdmin` or `user_roles` table
- Check Network tab for failed API calls

**Solution:**
1. Make sure `user_roles` table exists
2. Make sure `roles` table exists
3. Make sure you have at least one role with `name = 'admin'`

### 4. RLS Policies Blocking
RLS policies might be blocking the query to `user_roles` table.

**Solution:**
Run this to check RLS on user_roles:
```sql
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_roles';
```

If there are no policies or they're blocking, you may need to:
1. Run `fix_rls_policies_use_function.sql`
2. Or temporarily disable RLS for testing:
```sql
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
```

## Debugging Steps

### Step 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for:
   - `User permissions:` log
   - `Admin status check:` log
   - Any error messages

### Step 2: Check Network Tab
1. Go to Network tab in DevTools
2. Refresh the page
3. Look for failed requests to:
   - `/api/roles`
   - `/api/users`
   - Supabase queries

### Step 3: Check Database
Run this SQL to verify your setup:
```sql
-- Check if you have admin role
SELECT 
  u.email,
  r.name as role_name,
  r.status as role_status
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'your-email@example.com'
AND r.name = 'admin';

-- Check if is_admin function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'is_admin';
```

### Step 4: Temporary Fix for Testing
If you want to temporarily show buttons for testing, you can modify the code:

```typescript
// Temporary: Always show buttons (REMOVE IN PRODUCTION!)
const canCreate = true
const canEdit = true
const canDelete = true
```

**⚠️ WARNING:** Only use this for testing! Remove it before deploying to production.

## Expected Console Output

When working correctly, you should see in the console:
```
Admin status check: { userId: '...', isAdmin: true }
User permissions: { profileId: '...', isUserAdmin: true, isCheckingAdmin: false, canCreate: true, canEdit: true, canDelete: true }
```

## Quick Fix Checklist

- [ ] Run `quick_fix_check_user_admin.sql` to assign admin role
- [ ] Check browser console for errors
- [ ] Verify `profile?.id` exists in auth store
- [ ] Check if `user_roles` table has your user with admin role
- [ ] Verify RLS policies are set up correctly
- [ ] Try logging out and logging in again
- [ ] Clear browser cache and hard refresh (Ctrl+Shift+R)

## Still Not Working?

If buttons still don't show after all these steps:
1. Share the console output
2. Share the Network tab errors
3. Share the result of the SQL queries above

