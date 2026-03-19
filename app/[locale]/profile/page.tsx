import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { ProfilePageClient } from '@/components/landing/ProfilePageClient'
import { PropertyPagesFallback } from '@/components/landing/PropertyPagesFallback'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function LocalizedProfilePage({
  params,
}: {
  params: { locale: string }
}) {
  const forcedLocale = params.locale === 'ar' ? 'ar' : 'en'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${forcedLocale}/login?next=/${forcedLocale}/profile`)
  }

  return (
    <Suspense fallback={<PropertyPagesFallback />}>
      <ProfilePageClient forcedLocale={forcedLocale} />
    </Suspense>
  )
}
