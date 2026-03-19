import { Suspense } from 'react'
import { BookingsPageClient } from '@/components/landing/BookingsPageClient'
import { PropertyPagesFallback } from '@/components/landing/PropertyPagesFallback'

export const dynamic = 'force-dynamic'

export default function LocalizedBookingsPage({
  params,
}: {
  params: { locale: string }
}) {
  const forcedLocale = params.locale === 'ar' ? 'ar' : 'en'
  return (
    <Suspense fallback={<PropertyPagesFallback />}>
      <BookingsPageClient forcedLocale={forcedLocale} />
    </Suspense>
  )
}
