# Fix RLS Infinite Recursion Error

## Problem
```
Error: infinite recursion detected in policy for relation "users"
Code: 42P17
```

This happens when RLS policies try to check the `users` table while querying the `users` table, creating an infinite loop.

## Root Cause
The policies were written like this:
```sql
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
```

When you query `users`, it checks the policy, which queries `users`, which checks the policy again... infinite loop!

## Solution

### Step 1: Run the Fix Script
1. Open **Supabase Dashboard → SQL Editor**
2. Copy the entire contents of `fix_rls_recursion.sql`
3. Paste and **Run** the script

### Step 2: What the Script Does
1. ✅ Creates a `is_admin()` function that bypasses RLS (using `SECURITY DEFINER`)
2. ✅ Drops the problematic policies
3. ✅ Recreates policies using the function (no recursion!)
4. ✅ Fixes the same issue in other tables (team_users, etc.)

### Step 3: Test
After running the script:
1. Refresh your browser
2. Try logging in again
3. The dashboard should load without errors

## How It Works

**Before (Recursive):**
```sql
-- Policy checks users table → triggers policy → checks users table → infinite loop
USING (EXISTS(SELECT 1 FROM users WHERE ...))
```

**After (Fixed):**
```sql
-- Function bypasses RLS, so no recursion
USING (public.is_admin(auth.uid()))
```

The `SECURITY DEFINER` function runs with elevated privileges and bypasses RLS, so it can check the role without triggering the policy again.

## Verify It's Fixed

Run this query to test:
```sql
-- Should return true/false without error
SELECT public.is_admin(auth.uid());
```

## If You Still Get Errors

1. **Check if function exists:**
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'is_admin';
   ```

2. **Check policies:**
   ```sql
   SELECT policyname FROM pg_policies WHERE tablename = 'users';
   ```

3. **Manually grant permissions if needed:**
   ```sql
   GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
   ```

## Important Notes

- The `is_admin()` function is safe - it only checks roles, doesn't modify data
- `SECURITY DEFINER` is necessary here to break the recursion
- All policies now use this function instead of direct queries

## After Fixing

Your app should now:
- ✅ Load user profiles without errors
- ✅ Allow admins to see all users
- ✅ Allow users to see their own profile
- ✅ Work correctly with all RLS policies

