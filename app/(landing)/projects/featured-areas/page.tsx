import { cookies } from 'next/headers'
import { FeaturedAreasPageClient } from '@/components/landing/FeaturedAreasPageClient'

export const dynamic = 'force-dynamic'

export default function FeaturedAreasPage() {
  const forcedLocale = cookies().get('locale')?.value === 'ar' ? 'ar' : 'en'
  return <FeaturedAreasPageClient forcedLocale={forcedLocale} />
}
