import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { PropertiesPageClient } from '@/components/landing/PropertiesPageClient'
import { PropertyPagesFallback } from '@/components/landing/PropertyPagesFallback'

export default function PropertiesForRentPage() {
  const forcedLocale = cookies().get('locale')?.value === 'ar' ? 'ar' : 'en'
  return (
    <Suspense fallback={<PropertyPagesFallback />}>
      <PropertiesPageClient
        initialSection="rent"
        heading={{ ar: 'عقارات للايجار', en: 'Properties For Rent' }}
        forcedLocale={forcedLocale}
      />
    </Suspense>
  )
}
