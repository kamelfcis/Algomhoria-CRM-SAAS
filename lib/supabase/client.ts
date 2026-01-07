import { createBrowserClient } from '@supabase/ssr'

// Create untyped client to avoid strict type checking issues
// This is necessary because the Database types may not include all tables
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

