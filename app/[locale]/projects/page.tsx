import { Suspense } from 'react'
import { ProjectsPageClient } from '@/components/landing/ProjectsPageClient'

export const dynamic = 'force-dynamic'

export default function LocalizedProjectsPage({
  params,
}: {
  params: { locale: string }
}) {
  const forcedLocale = params.locale === 'ar' ? 'ar' : 'en'
  return (
    <Suspense fallback={<div className="container py-5">Loading...</div>}>
      <ProjectsPageClient forcedLocale={forcedLocale} />
    </Suspense>
  )
}
