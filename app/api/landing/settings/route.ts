import { NextResponse } from 'next/server'
import { getLandingPublicSettings } from '@/lib/landing/queries'

export async function GET() {
  try {
    const data = await getLandingPublicSettings()
    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Landing settings API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch landing settings', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
