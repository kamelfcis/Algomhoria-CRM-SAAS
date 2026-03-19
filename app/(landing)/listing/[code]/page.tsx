import { PropertyDetailsClient } from '@/components/landing/PropertyDetailsClient'
import { cookies } from 'next/headers'

export default function PropertyListingPage({
  params,
}: {
  params: { code: string }
}) {
  const forcedLocale = cookies().get('locale')?.value === 'ar' ? 'ar' : 'en'
  return <PropertyDetailsClient code={params.code} forcedLocale={forcedLocale} />
}
