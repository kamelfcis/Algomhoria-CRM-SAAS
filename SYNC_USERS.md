# Sync Users from Supabase Auth to Users Table

## Problem
When you create a user directly in Supabase Authentication dashboard, it doesn't automatically create a corresponding record in the `public.users` table. This causes login issues because the app expects users to exist in both places.

## Solution

### Option 1: Automatic Sync (Recommended)
Run the `supabase_sync_users.sql` script in your Supabase SQL Editor. This will:
1. Create a trigger that automatically creates a `users` record when a new user is created in auth
2. Sync all existing users from `auth.users` to `public.users`

### Option 2: Manual Sync (One-time)
If you just need to sync existing users, run this SQL:

```sql
-- Sync existing users
INSERT INTO public.users (id, email, password_hash, name, role, status)
SELECT 
  au.id,
  au.email,
  '',
  COALESCE(au.raw_user_meta_data->>'name', au.email, 'User') as name,
  COALESCE(au.raw_user_meta_data->>'role', 'user')::text as role,
  'active' as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;
```

### Option 3: Create User via Admin Dashboard
Use the admin dashboard to create users - it will automatically create records in both places.

## Steps to Fix Your Current User

1. **Open Supabase SQL Editor**
   - Go to your Supabase Dashboard
   - Navigate to SQL Editor

2. **Run the sync script**
   - Copy the contents of `supabase_sync_users.sql`
   - Paste and run it in SQL Editor

3. **Verify the sync**
   - Run this query to check:
   ```sql
   SELECT 
     au.id,
     au.email,
     pu.id as user_table_id,
     pu.name,
     pu.role
   FROM auth.users au
   LEFT JOIN public.users pu ON au.id = pu.id;
   ```

4. **Set admin role** (if needed)
   ```sql
   UPDATE users 
   SET role = 'admin' 
   WHERE email = 'your-email@example.com';
   ```

## After Running the Script

- ✅ New users created in Supabase Auth will automatically get a `users` table record
- ✅ All existing users are synced
- ✅ You can now log in with your existing auth users

## Important Notes

- The trigger uses `raw_user_meta_data` to get user name and role
- If metadata is not set, it defaults to:
  - `name`: User's email
  - `role`: 'user'
- You can update user metadata when creating users in Supabase Auth:
  ```json
  {
    "name": "John Doe",
    "role": "admin"
  }
  ```

## Troubleshooting

### User still can't log in
1. Check if user exists in `public.users`:
   ```sql
   SELECT * FROM users WHERE email = 'user@example.com';
   ```

2. If missing, run the sync script again

3. Check user role:
   ```sql
   SELECT email, role, status FROM users WHERE email = 'user@example.com';
   ```

### Trigger not working
- Make sure the trigger function has `SECURITY DEFINER` (it does in the script)
- Check trigger exists:
  ```sql
  SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
  ```

