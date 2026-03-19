import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { PublicLoginClient } from '@/components/landing/PublicLoginClient'
import { PropertyPagesFallback } from '@/components/landing/PropertyPagesFallback'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function LandingLoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/')

  const forcedLocale = cookies().get('locale')?.value === 'ar' ? 'ar' : 'en'
  return (
    <Suspense fallback={<PropertyPagesFallback />}>
      <PublicLoginClient forcedLocale={forcedLocale} />
    </Suspense>
  )
}
