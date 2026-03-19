import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ProfilePageClient } from '@/components/landing/ProfilePageClient'
import { PropertyPagesFallback } from '@/components/landing/PropertyPagesFallback'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function LandingProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/profile')
  }

  const forcedLocale = cookies().get('locale')?.value === 'ar' ? 'ar' : 'en'
  return (
    <Suspense fallback={<PropertyPagesFallback />}>
      <ProfilePageClient forcedLocale={forcedLocale} />
    </Suspense>
  )
}
