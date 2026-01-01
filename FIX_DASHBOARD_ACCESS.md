# Fix Dashboard Access Issue

## Problem
You can't see the dashboard because your user exists in `auth.users` but not in `public.users` table.

## Quick Fix (3 Steps)

### Step 1: Check Your User Status
Run this SQL in Supabase SQL Editor to see your user status:

```sql
SELECT 
  au.id as auth_id,
  au.email,
  pu.id as user_table_id,
  pu.name,
  pu.role,
  pu.status,
  CASE 
    WHEN pu.id IS NULL THEN '❌ Missing in users table'
    ELSE '✅ OK'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'your-email@example.com';
```

### Step 2: Sync Your User
Run the sync script in Supabase SQL Editor:

1. Open `supabase_sync_users.sql` file
2. Copy all contents
3. Paste in Supabase SQL Editor
4. Click "Run"

This will:
- ✅ Create your user in the `users` table
- ✅ Set up automatic syncing for future users

### Step 3: Set Admin Role (Optional)
If you want admin access, run:

```sql
UPDATE users 
SET role = 'admin',
    name = 'Your Name'  -- Replace with your actual name
WHERE email = 'your-email@example.com';
```

### Step 4: Refresh Dashboard
Go back to your browser and refresh the dashboard page. It should work now!

## Alternative: Manual User Creation

If the sync script doesn't work, manually create your user:

```sql
-- Get your user ID from auth.users
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then insert into users table (replace the ID and email)
INSERT INTO public.users (id, email, password_hash, name, role, status)
VALUES (
  'your-user-id-from-auth',  -- Replace with actual ID
  'your-email@example.com',  -- Replace with your email
  '',                        -- Password handled by Supabase Auth
  'Your Name',               -- Your name
  'admin',                   -- Role: admin, moderator, sales, or user
  'active'                   -- Status: active, inactive, or suspended
);
```

## Verify It Works

After running the sync, check:

```sql
SELECT id, email, name, role, status FROM users WHERE email = 'your-email@example.com';
```

You should see your user with all fields populated.

## Still Having Issues?

1. **Check browser console** - Look for any error messages
2. **Check Supabase logs** - Go to Logs → Postgres Logs
3. **Verify RLS policies** - Make sure you can read from `users` table
4. **Clear browser cache** - Sometimes cached data causes issues

## Prevention

After running the sync script, all future users created in Supabase Auth will automatically get a record in the `users` table. No manual syncing needed!

