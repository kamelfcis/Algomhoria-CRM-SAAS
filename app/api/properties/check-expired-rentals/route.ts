import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, rateLimitPresets } from '@/lib/utils/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (strict: 10 requests per minute for system operations)
    // Note: Cron jobs with service role key can bypass this if needed
    const authHeader = request.headers.get('authorization')
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    // Only apply rate limiting if not using service role key (for manual triggers)
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.replace('Bearer ', '') !== serviceRoleKey) {
      const rateLimitResponse = rateLimit(request, rateLimitPresets.strict)
      if (rateLimitResponse) {
        return rateLimitResponse
      }
    }
    
    let supabase
    
    // If service role key is provided in Authorization header, use admin client
    if (authHeader && authHeader.startsWith('Bearer ') && serviceRoleKey) {
      const providedKey = authHeader.replace('Bearer ', '')
      if (providedKey === serviceRoleKey) {
        // Use admin client for cron jobs (bypasses RLS)
        supabase = createAdminClient()
      } else {
        // Try regular authentication
        supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
      }
    } else {
      // Use regular client and check user authentication
      supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Try to call the database function first
    let data, error
    try {
      const result = await supabase.rpc('update_expired_rentals')
      data = result.data
      error = result.error
    } catch (e: any) {
      error = e
    }

    // If function doesn't exist or fails, use direct query as fallback
    if (error && (error.code === '42883' || error.message?.includes('does not exist') || error.message?.includes('function'))) {
      console.warn('Database function not found, using direct query fallback')
      
      // Fallback: Direct query to update expired rentals
      const { data: expiredProperties, error: selectError } = await supabase
        .from('properties')
        .select('id')
        .eq('is_rented', true)
        .not('rental_end_date', 'is', null)
        .lt('rental_end_date', new Date().toISOString())

      if (selectError) {
        console.error('Error selecting expired rentals:', selectError)
        return NextResponse.json(
          { 
            error: 'Failed to check expired rentals', 
            details: selectError.message,
            hint: 'Please ensure the rental_end_date column exists. Run add_rental_end_date.sql in Supabase SQL Editor'
          },
          { status: 500 }
        )
      }

      const propertyIds = expiredProperties?.map(p => p.id) || []
      
      if (propertyIds.length > 0) {
        const { error: updateError } = await supabase
          .from('properties')
          .update({ 
            is_rented: false, 
            rental_end_date: null,
            updated_at: new Date().toISOString() 
          })
          .in('id', propertyIds)

        if (updateError) {
          console.error('Error updating expired rentals:', updateError)
          return NextResponse.json(
            { 
              error: 'Failed to update expired rentals', 
              details: updateError.message
            },
            { status: 500 }
          )
        }
      }

      return NextResponse.json({
        success: true,
        updatedCount: propertyIds.length,
        propertyIds,
        message: `Successfully updated ${propertyIds.length} expired rental(s)`,
        note: 'Used direct query fallback (database function not found)'
      })
    }

    if (error) {
      console.error('Error updating expired rentals:', error)
      console.error('Error code:', error.code)
      console.error('Error details:', error.details)
      console.error('Error hint:', error.hint)
      
      return NextResponse.json(
        { 
          error: 'Failed to update expired rentals', 
          details: error.message,
          code: error.code,
          hint: error.hint
        },
        { status: 500 }
      )
    }

    // Handle different response formats
    let result
    if (typeof data === 'string') {
      // Function returns JSON string
      try {
        result = JSON.parse(data)
      } catch (e) {
        result = { updated_count: 0, property_ids: [] }
      }
    } else if (Array.isArray(data) && data.length > 0) {
      // Function returns array with single row
      result = data[0]
    } else if (data && typeof data === 'object' && 'updated_count' in data) {
      // Function returns object directly
      result = data
    } else {
      // Default fallback
      result = { updated_count: 0, property_ids: [] }
    }
    
    const updatedCount = result.updated_count || 0
    const propertyIds = result.property_ids || []
    
    return NextResponse.json({
      success: true,
      updatedCount,
      propertyIds: Array.isArray(propertyIds) ? propertyIds : [],
      message: `Successfully updated ${updatedCount} expired rental(s)`
    })
  } catch (error: any) {
    console.error('Error in check-expired-rentals API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

