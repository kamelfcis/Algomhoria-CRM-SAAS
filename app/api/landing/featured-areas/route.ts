import { NextRequest, NextResponse } from 'next/server'
import { getLandingFeaturedAreas } from '@/lib/landing/queries'

export const dynamic = 'force-dynamic'

function normalizeLocale(input: string | null): 'ar' | 'en' {
  return input === 'ar' ? 'ar' : 'en'
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const locale = normalizeLocale(params.get('locale'))
    const data = await getLandingFeaturedAreas(locale, {
      governorateId: params.get('governorateId') || undefined,
      areaId: params.get('areaId') || undefined,
      categoryId: params.get('categoryId') || undefined,
    })
    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Landing featured areas API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch featured areas', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
