# Setup Instructions

## Quick Start

1. **Install Dependencies**
```bash
npm install
```

2. **Configure Environment Variables**
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. **Set Up Database**
   - Open your Supabase project dashboard
   - Go to SQL Editor
   - Run the `supabase_migration_full.sql` file
   - This will create all necessary tables, indexes, and RLS policies

4. **Create First Admin User**
   - Go to Supabase Dashboard → Authentication → Users
   - Create a new user manually
   - Then in SQL Editor, run:
   ```sql
   UPDATE users 
   SET role = 'admin' 
   WHERE email = 'your-admin-email@example.com';
   ```

5. **Start Development Server**
```bash
npm run dev
```

6. **Access the Dashboard**
   - Open http://localhost:3000
   - Login with your admin credentials
   - You should see the dashboard

## Important Notes

### User Creation
- Currently, user creation inserts into the `users` table directly
- For production, you should:
  1. Use Supabase Admin API (with service role key) in a secure server environment
  2. Or use Supabase Edge Functions
  3. Or create users through Supabase Dashboard and update roles via SQL

### Authentication
- The app uses Supabase Auth for authentication
- User profiles are stored in the `users` table
- RLS policies control access - make sure they're properly configured

### Roles
The database schema uses: `admin`, `moderator`, `sales`, `user`
But the app expects: `admin`, `manager`, `moderator`, `data_entry`

**You need to either:**
1. Update the database schema to match app roles, OR
2. Map database roles to app roles in the code

### RLS Policies
Make sure RLS policies are set up correctly:
- Users can only see their own data (unless admin)
- Admins can see and modify all data
- Check `supabase_migration_full.sql` for existing policies

## Troubleshooting

### "Unauthorized" errors
- Check that RLS policies allow the operation
- Verify user role in database matches expected role
- Check Supabase URL and keys are correct

### User creation fails
- Ensure you're logged in as admin
- Check RLS policies allow INSERT on users table
- Verify email is unique

### Theme/Language not persisting
- Clear browser localStorage
- Check browser console for errors
- Verify Zustand persist middleware is working

## Next Steps

1. Customize the dashboard for your needs
2. Add more pages and features
3. Configure email templates in Supabase
4. Set up proper user creation flow with email verification
5. Add more role-based permissions as needed

