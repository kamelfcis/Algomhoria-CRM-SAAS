import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { PublicLoginClient } from '@/components/landing/PublicLoginClient'
import { PropertyPagesFallback } from '@/components/landing/PropertyPagesFallback'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function LocalizedLoginPage({
  params,
}: {
  params: { locale: string }
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect(`/${params.locale === 'ar' ? 'ar' : 'en'}`)

  const forcedLocale = params.locale === 'ar' ? 'ar' : 'en'
  return (
    <Suspense fallback={<PropertyPagesFallback />}>
      <PublicLoginClient forcedLocale={forcedLocale} />
    </Suspense>
  )
}
