import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, rateLimitPresets } from '@/lib/utils/rate-limit'

export const dynamic = 'force-dynamic'

function pickLocalized(locale: 'ar' | 'en', arValue: string | null | undefined, enValue: string | null | undefined) {
  if (locale === 'ar') return arValue || enValue || ''
  return enValue || arValue || ''
}

export async function GET(request: NextRequest) {
  try {
    const limited = rateLimit(request, rateLimitPresets.moderate)
    if (limited) return limited

    const locale = request.nextUrl.searchParams.get('locale') === 'ar' ? 'ar' : 'en'
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const userEmail = user.email.trim().toLowerCase()
    const { data: bookings, error: bookingsError } = await admin
      .from('property_bookings')
      .select(
        'id, property_id, booking_from_date, booking_to_date, status, total_price, created_at, customer_name, customer_email, customer_phone'
      )
      .ilike('customer_email', userEmail)
      .order('created_at', { ascending: false })
      .limit(300)

    if (bookingsError) {
      return NextResponse.json(
        { error: 'Failed to fetch bookings', details: bookingsError.message || 'Unknown error' },
        { status: 500 }
      )
    }

    const propertyIds = [...new Set((bookings || []).map((item: any) => item.property_id).filter(Boolean))]
    let propertiesMap = new Map<string, { code: string; title: string; location: string; image_url: string | null }>()

    if (propertyIds.length > 0) {
      const { data: properties, error: propertiesError } = await admin
        .from('properties')
        .select(
          'id, code, title_ar, title_en, location_text, governorates(name_ar, name_en), areas(name_ar, name_en), property_images(image_url, is_primary, order_index)'
        )
        .in('id', propertyIds)
        .limit(300)

      if (propertiesError) {
        return NextResponse.json(
          { error: 'Failed to fetch booking properties', details: propertiesError.message || 'Unknown error' },
          { status: 500 }
        )
      }

      propertiesMap = new Map(
        (properties || []).map((property: any) => {
          const governorateObj = Array.isArray(property.governorates) ? property.governorates[0] : property.governorates
          const areaObj = Array.isArray(property.areas) ? property.areas[0] : property.areas
          const images = Array.isArray(property.property_images) ? property.property_images : []
          const sortedImages = [...images].sort((a: any, b: any) => (a?.order_index || 0) - (b?.order_index || 0))
          const primaryImage =
            images.find((img: any) => img?.is_primary)?.image_url ||
            sortedImages[0]?.image_url ||
            null
          const location =
            property.location_text ||
            [pickLocalized(locale, governorateObj?.name_ar, governorateObj?.name_en), pickLocalized(locale, areaObj?.name_ar, areaObj?.name_en)]
              .filter(Boolean)
              .join(' - ')

          return [
            String(property.id),
            {
              code: String(property.code || ''),
              title: String(pickLocalized(locale, property.title_ar, property.title_en) || ''),
              location: String(location || ''),
              image_url: primaryImage ? String(primaryImage) : null,
            },
          ]
        })
      )
    }

    const rows = (bookings || []).map((booking: any) => {
      const property = propertiesMap.get(String(booking.property_id || ''))
      return {
        id: String(booking.id || ''),
        property_id: String(booking.property_id || ''),
        booking_from_date: String(booking.booking_from_date || ''),
        booking_to_date: String(booking.booking_to_date || ''),
        status: String(booking.status || 'pending'),
        total_price: Number(booking.total_price || 0),
        created_at: booking.created_at || null,
        customer_name: String(booking.customer_name || ''),
        customer_email: String(booking.customer_email || ''),
        customer_phone: String(booking.customer_phone || ''),
        property: property || null,
      }
    })

    return NextResponse.json({ data: rows })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
