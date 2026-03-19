import { PropertyDetailsClient } from '@/components/landing/PropertyDetailsClient'

export default function LocalizedPropertyListingPage({
  params,
}: {
  params: { locale: string; code: string }
}) {
  const locale = params.locale === 'ar' ? 'ar' : 'en'
  return <PropertyDetailsClient code={params.code} forcedLocale={locale} />
}
