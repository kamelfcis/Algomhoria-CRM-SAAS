import { NextRequest, NextResponse } from 'next/server'
import { getLandingSections } from '@/lib/landing/queries'

export const dynamic = 'force-dynamic'
const SECTIONS_CACHE_CONTROL = 'public, max-age=300, s-maxage=1800, stale-while-revalidate=3600'

function normalizeLocale(input: string | null): 'ar' | 'en' {
  return input === 'ar' ? 'ar' : 'en'
}

export async function GET(request: NextRequest) {
  try {
    const locale = normalizeLocale(request.nextUrl.searchParams.get('locale'))
    const data = await getLandingSections(locale)
    return NextResponse.json(
      { data },
      { headers: { 'Cache-Control': SECTIONS_CACHE_CONTROL } }
    )
  } catch (error: any) {
    console.error('Landing sections API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch landing sections', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
