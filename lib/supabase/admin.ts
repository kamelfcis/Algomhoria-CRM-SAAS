import { createClient as supabaseCreateClient } from '@supabase/supabase-js'

// Server-side admin client with service role key
// This should ONLY be used in API routes, never in client components
// Service role key bypasses RLS automatically
// Returns untyped client to avoid strict type checking issues with dynamic tables
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  }

  // Create client with service role key (untyped for flexibility)
  // This bypasses RLS automatically
  return supabaseCreateClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-client-info': 'supabase-js-admin',
      },
    },
  })
}

