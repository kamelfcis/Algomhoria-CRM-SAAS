import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PropertyPagesFallback } from '@/components/landing/PropertyPagesFallback'
import { MyBookingsPageClient } from '@/components/landing/MyBookingsPageClient'

export const dynamic = 'force-dynamic'

export default async function LandingMyBookingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/my-bookings')
  }

  const forcedLocale = cookies().get('locale')?.value === 'ar' ? 'ar' : 'en'

  return (
    <Suspense fallback={<PropertyPagesFallback />}>
      <MyBookingsPageClient forcedLocale={forcedLocale} />
    </Suspense>
  )
}
