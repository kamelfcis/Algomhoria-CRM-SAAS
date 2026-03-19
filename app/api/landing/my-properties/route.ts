import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, rateLimitPresets } from '@/lib/utils/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const limited = rateLimit(request, rateLimitPresets.moderate)
    if (limited) return limited

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('properties')
      .select(
        'id, code, title_ar, title_en, status, created_at, updated_at, sale_price, rent_price, price, location_text'
      )
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch properties', details: error.message || 'Unknown error' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch properties', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
