# Environment Variables Setup

## Create `.env.local` file

Create a file named `.env.local` in the root of your project with the following content:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://cyqgssqvxxjnrqncxtea.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5cWdzc3F2eHhqbnJxbmN4dGVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNTI0MzUsImV4cCI6MjA4MTcyODQzNX0.4kww6ctfV2EL3D4gGgPyuFTL7d6OHKIoW0WsUEACcb8

# Service Role Key (ONLY for server-side API routes - NEVER expose to frontend)
# This key bypasses RLS and should only be used in secure server environments
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5cWdzc3F2eHhqbnJxbmN4dGVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjE1MjQzNSwiZXhwIjoyMDgxNzI4NDM1fQ.x9tCjw7Gr1Qe0OblLEtqnO7OvWF1uUrKSuSxoAfbIXw

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google Maps API (for location autocomplete and map display)
# Get your API key from: https://console.cloud.google.com/google/maps-apis
# REQUIRED APIs to enable:
# 1. Maps JavaScript API
# 2. Places API
# 3. Geocoding API (for reverse geocoding - converting coordinates to addresses)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

## Important Security Notes

⚠️ **CRITICAL**: 
- The `.env.local` file is already in `.gitignore` and will NOT be committed to git
- **NEVER** commit your service role key to version control
- The service role key is only used in server-side API routes
- The anon key is safe to use in client-side code (it's public)

## What I've Updated

I've updated the API routes to properly use the service role key:
- ✅ `app/api/users/route.ts` - Now creates users in Supabase Auth properly
- ✅ `app/api/users/[id]/route.ts` - Now deletes users from both database and auth
- ✅ `lib/supabase/admin.ts` - New admin client for server-side operations

## Next Steps

1. Create the `.env.local` file with the content above
2. Run `npm install` to install dependencies
3. Run the database migration (`supabase_migration_full.sql`)
4. Start the dev server: `npm run dev`

