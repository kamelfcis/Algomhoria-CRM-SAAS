import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { BookingsPageClient } from '@/components/landing/BookingsPageClient'
import { PropertyPagesFallback } from '@/components/landing/PropertyPagesFallback'

export const dynamic = 'force-dynamic'

export default function BookingsPage() {
  const forcedLocale = cookies().get('locale')?.value === 'ar' ? 'ar' : 'en'
  return (
    <Suspense fallback={<PropertyPagesFallback />}>
      <BookingsPageClient forcedLocale={forcedLocale} />
    </Suspense>
  )
}
