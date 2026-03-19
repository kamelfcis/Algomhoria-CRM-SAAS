import { NextRequest, NextResponse } from 'next/server'
import { getLandingProperties } from '@/lib/landing/queries'

export const dynamic = 'force-dynamic'
const PROPERTIES_CACHE_CONTROL = 'public, max-age=20, s-maxage=60, stale-while-revalidate=180'

function normalizeLocale(input: string | null): 'ar' | 'en' {
  return input === 'ar' ? 'ar' : 'en'
}

function parseNumber(input: string | null): number | undefined {
  if (!input) return undefined
  const value = Number(input)
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const locale = normalizeLocale(params.get('locale'))
    const priceFrom = parseNumber(params.get('priceFrom'))
    const priceTo = parseNumber(params.get('priceTo'))
    const areaFrom = parseNumber(params.get('areaFrom'))
    const areaTo = parseNumber(params.get('areaTo'))

    if (
      (typeof priceFrom === 'number' && typeof priceTo === 'number' && priceFrom > priceTo) ||
      (typeof areaFrom === 'number' && typeof areaTo === 'number' && areaFrom > areaTo)
    ) {
      return NextResponse.json({ error: 'Invalid numeric range filters' }, { status: 400 })
    }

    const data = await getLandingProperties(locale, {
      city: params.get('city') || undefined,
      area: params.get('area') || undefined,
      propertyType: params.get('propertyType') || undefined,
      section: params.get('section') || undefined,
      q: params.get('q') || undefined,
      priceFrom,
      priceTo,
      areaFrom,
      areaTo,
      governorateId: params.get('governorateId') || undefined,
      areaId: params.get('areaId') || undefined,
      propertyTypeId: params.get('propertyTypeId') || undefined,
      sectionId: params.get('sectionId') || undefined,
      bookingFromDate: params.get('bookingFromDate') || undefined,
      bookingToDate: params.get('bookingToDate') || undefined,
    })

    return NextResponse.json(
      { data },
      { headers: { 'Cache-Control': PROPERTIES_CACHE_CONTROL } }
    )
  } catch (error: any) {
    if (error?.message === 'INVALID_DATE_RANGE') {
      return NextResponse.json({ error: 'Invalid booking date range' }, { status: 400 })
    }

    const details = String(error?.message || error?.details || '')
    const isNetworkIssue =
      /ENOTFOUND|ECONNREFUSED|EAI_AGAIN|getaddrinfo|fetch failed/i.test(details)

    console.error('Landing properties API error:', {
      message: error?.message || 'Unknown error',
      details,
      fallbackToEmptyList: isNetworkIssue,
    })

    if (isNetworkIssue) {
      return NextResponse.json(
        {
          data: [],
          warning: 'Properties temporarily unavailable due to network issue',
        },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch properties', details: details || 'Unknown error' },
      { status: 500 }
    )
  }
}
