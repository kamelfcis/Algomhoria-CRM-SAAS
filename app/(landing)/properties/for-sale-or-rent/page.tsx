import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { PropertiesPageClient } from '@/components/landing/PropertiesPageClient'
import { PropertyPagesFallback } from '@/components/landing/PropertyPagesFallback'

export default function PropertiesForSaleOrRentPage() {
  const forcedLocale = cookies().get('locale')?.value === 'ar' ? 'ar' : 'en'
  return (
    <Suspense fallback={<PropertyPagesFallback />}>
      <PropertiesPageClient
        initialSection="all"
        heading={{ ar: 'عقارات للبيع او الايجار', en: 'Properties For Sale or Rent' }}
        forcedLocale={forcedLocale}
      />
    </Suspense>
  )
}
