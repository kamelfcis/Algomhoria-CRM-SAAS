import { NextRequest, NextResponse } from 'next/server'
import { getLandingPropertyDetails } from '@/lib/landing/queries'

function normalizeLocale(input: string | null): 'ar' | 'en' {
  return input === 'ar' ? 'ar' : 'en'
}

export async function GET(
  request: NextRequest,
  context: { params: { code: string } }
) {
  try {
    const locale = normalizeLocale(request.nextUrl.searchParams.get('locale'))
    const code = context.params.code
    const data = await getLandingPropertyDetails(locale, code)

    if (!data) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Landing property details API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch property details', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
