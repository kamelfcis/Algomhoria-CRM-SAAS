import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
const TEAM_USERS_CACHE_CONTROL = 'public, max-age=120, s-maxage=600, stale-while-revalidate=1800'

function normalizeLocale(input: string | null): 'ar' | 'en' {
  return input === 'ar' ? 'ar' : 'en'
}

export async function GET(request: NextRequest) {
  try {
    const locale = normalizeLocale(request.nextUrl.searchParams.get('locale'))
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('team_users')
      .select('id, name, name_ar, position, poition_ar, image_url, order_index, status')
      .eq('status', 'active')
      .order('order_index', { ascending: true })
      .limit(200)

    if (error) throw error

    const items = (data || []).map((item: any) => ({
      id: String(item.id || ''),
      name: locale === 'ar' ? (item.name_ar || item.name || '') : (item.name || item.name_ar || ''),
      position: locale === 'ar' ? (item.poition_ar || item.position || '') : (item.position || item.poition_ar || ''),
      image_url: item.image_url || null,
      order_index: Number(item.order_index || 0),
      status: String(item.status || 'active'),
    }))

    return NextResponse.json(
      { data: items },
      { headers: { 'Cache-Control': TEAM_USERS_CACHE_CONTROL } }
    )
  } catch (error: any) {
    console.error('Landing team users API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team users', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
