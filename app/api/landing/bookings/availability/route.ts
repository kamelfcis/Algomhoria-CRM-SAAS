import { NextRequest, NextResponse } from 'next/server'
import { checkPropertyBookingAvailability } from '@/lib/landing/queries'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const propertyId = String(params.get('propertyId') || '').trim()
    const bookingFromDate = String(params.get('bookingFromDate') || '').trim()
    const bookingToDate = String(params.get('bookingToDate') || '').trim()

    if (!propertyId || !bookingFromDate || !bookingToDate) {
      return NextResponse.json(
        { error: 'Missing required query params: propertyId, bookingFromDate, bookingToDate' },
        { status: 400 }
      )
    }

    await checkPropertyBookingAvailability({
      propertyId,
      bookingFromDate,
      bookingToDate,
    })

    return NextResponse.json({ available: true })
  } catch (error: any) {
    if (error?.message === 'PROPERTY_NOT_FOUND') {
      return NextResponse.json({ error: 'The selected property is unavailable' }, { status: 404 })
    }
    if (error?.message === 'INVALID_DATE_RANGE') {
      return NextResponse.json({ error: 'Invalid booking date range' }, { status: 400 })
    }
    if (error?.message === 'BOOKING_CONFLICT') {
      return NextResponse.json({ available: false }, { status: 200 })
    }

    console.error('Booking availability API error:', error)
    return NextResponse.json(
      { error: 'Failed to check booking availability', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
