import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { PropertiesPageClient } from '@/components/landing/PropertiesPageClient'
import { PropertyPagesFallback } from '@/components/landing/PropertyPagesFallback'
import { getLandingSections } from '@/lib/landing/queries'

export default async function PropertiesBySectionPage({
  params,
}: {
  params: { id: string }
}) {
  const forcedLocale = cookies().get('locale')?.value === 'ar' ? 'ar' : 'en'
  const sectionId = decodeURIComponent(String(params?.id || '')).trim()

  let sectionName = forcedLocale === 'ar' ? 'قسم العقارات' : 'Properties Section'
  if (sectionId) {
    try {
      const sections = await getLandingSections(forcedLocale)
      const matched = sections.find((item) => item.id === sectionId)
      if (matched?.name) sectionName = matched.name
    } catch {
      // Keep fallback heading if section lookup fails.
    }
  }

  return (
    <Suspense fallback={<PropertyPagesFallback />}>
      <PropertiesPageClient
        initialSection="all"
        forcedSectionId={sectionId}
        heading={{ ar: sectionName, en: sectionName }}
        forcedLocale={forcedLocale}
      />
    </Suspense>
  )
}
