import { NextRequest, NextResponse } from 'next/server'
import { getLandingHomeData } from '@/lib/landing/queries'

export const dynamic = 'force-dynamic'
const HOME_CACHE_CONTROL = 'public, max-age=30, s-maxage=120, stale-while-revalidate=300'

function normalizeLocale(input: string | null): 'ar' | 'en' {
  return input === 'ar' ? 'ar' : 'en'
}

export async function GET(request: NextRequest) {
  try {
    const localeParam = request.nextUrl.searchParams.get('locale')
    const locale = normalizeLocale(localeParam)
    const data = await getLandingHomeData(locale)
    return NextResponse.json(
      { data },
      { headers: { 'Cache-Control': HOME_CACHE_CONTROL } }
    )
  } catch (error: any) {
    console.error('Landing home API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch landing data', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
