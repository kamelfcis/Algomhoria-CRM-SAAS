import { NextRequest, NextResponse } from 'next/server'
import { createPropertyBooking } from '@/lib/landing/queries'

interface BookingBody {
  propertyId?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  bookingFromDate?: string
  bookingToDate?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BookingBody
    const requiredFields: Array<keyof BookingBody> = [
      'propertyId',
      'customerName',
      'customerEmail',
      'customerPhone',
      'bookingFromDate',
      'bookingToDate',
    ]

    const missingField = requiredFields.find((key) => !body[key])
    if (missingField) {
      return NextResponse.json(
        { error: `Missing required field: ${missingField}` },
        { status: 400 }
      )
    }

    await createPropertyBooking({
      propertyId: body.propertyId!,
      customerName: body.customerName!,
      customerEmail: body.customerEmail!,
      customerPhone: body.customerPhone!,
      bookingFromDate: body.bookingFromDate!,
      bookingToDate: body.bookingToDate!,
    })

    return NextResponse.json({
      success: true,
      message: 'Booking request submitted successfully',
    })
  } catch (error: any) {
    if (error?.message === 'PROPERTY_NOT_FOUND') {
      return NextResponse.json(
        { error: 'The selected property is unavailable' },
        { status: 404 }
      )
    }
    if (error?.message === 'INVALID_DATE_RANGE') {
      return NextResponse.json({ error: 'Invalid booking date range' }, { status: 400 })
    }
    if (error?.message === 'BOOKING_CONFLICT') {
      return NextResponse.json(
        { error: 'Selected property is not available for this date range' },
        { status: 409 }
      )
    }

    console.error('Landing booking API error:', error)
    return NextResponse.json(
      { error: 'Failed to submit booking', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
