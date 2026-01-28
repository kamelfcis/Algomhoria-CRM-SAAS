// Supabase Edge Function to check and update expired rentals
// This function is called by Supabase Scheduled Functions (cron)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Call the database function to update expired rentals
    const { data, error } = await supabase.rpc('update_expired_rentals')

    if (error) {
      console.error('Error updating expired rentals:', error)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: error.message,
          details: error
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Extract result from array (function returns array with single row)
    const result = data && Array.isArray(data) && data.length > 0 ? data[0] : { updated_count: 0, property_ids: [] }
    
    const updatedCount = result.updated_count || 0
    const propertyIds = result.property_ids || []

    console.log(`Successfully updated ${updatedCount} expired rental(s)`)
    if (propertyIds.length > 0) {
      console.log('Updated property IDs:', propertyIds)
    }

    return new Response(
      JSON.stringify({
        success: true,
        updatedCount,
        propertyIds,
        message: `Successfully updated ${updatedCount} expired rental(s)`,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error: any) {
    console.error('Error in check-expired-rentals function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

