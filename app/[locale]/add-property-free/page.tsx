import { Suspense } from 'react'
import { AddPropertyFreeClient } from '@/components/landing/AddPropertyFreeClient'
import { PropertyPagesFallback } from '@/components/landing/PropertyPagesFallback'

export const dynamic = 'force-dynamic'

export default function LocalizedAddPropertyFreePage({
  params,
}: {
  params: { locale: string }
}) {
  const forcedLocale = params.locale === 'ar' ? 'ar' : 'en'
  return (
    <Suspense fallback={<PropertyPagesFallback />}>
      <AddPropertyFreeClient forcedLocale={forcedLocale} />
    </Suspense>
  )
}
