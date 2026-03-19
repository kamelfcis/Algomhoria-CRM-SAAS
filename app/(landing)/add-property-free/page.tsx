import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { AddPropertyFreeClient } from '@/components/landing/AddPropertyFreeClient'
import { PropertyPagesFallback } from '@/components/landing/PropertyPagesFallback'

export const dynamic = 'force-dynamic'

export default function AddPropertyFreePage() {
  const forcedLocale = cookies().get('locale')?.value === 'ar' ? 'ar' : 'en'
  return (
    <Suspense fallback={<PropertyPagesFallback />}>
      <AddPropertyFreeClient forcedLocale={forcedLocale} />
    </Suspense>
  )
}
