import { NextRequest, NextResponse } from 'next/server'
import { getLandingProjectDetails } from '@/lib/landing/queries'

function normalizeLocale(input: string | null): 'ar' | 'en' {
  return input === 'ar' ? 'ar' : 'en'
}

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const locale = normalizeLocale(request.nextUrl.searchParams.get('locale'))
    const id = context.params.id
    const data = await getLandingProjectDetails(locale, id)

    if (!data) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Landing project details API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project details', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
