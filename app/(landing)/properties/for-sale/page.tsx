import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { PropertiesPageClient } from '@/components/landing/PropertiesPageClient'
import { PropertyPagesFallback } from '@/components/landing/PropertyPagesFallback'

export default function PropertiesForSalePage() {
  const forcedLocale = cookies().get('locale')?.value === 'ar' ? 'ar' : 'en'
  return (
    <Suspense fallback={<PropertyPagesFallback />}>
      <PropertiesPageClient
        initialSection="sale"
        heading={{ ar: 'عقارات للبيع', en: 'Properties For Sale' }}
        forcedLocale={forcedLocale}
      />
    </Suspense>
  )
}
