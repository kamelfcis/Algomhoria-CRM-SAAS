import { FeaturedAreasPageClient } from '@/components/landing/FeaturedAreasPageClient'

export const dynamic = 'force-dynamic'

export default function LocalizedFeaturedAreasPage({
  params,
}: {
  params: { locale: string }
}) {
  const forcedLocale = params.locale === 'ar' ? 'ar' : 'en'
  return <FeaturedAreasPageClient forcedLocale={forcedLocale} />
}
