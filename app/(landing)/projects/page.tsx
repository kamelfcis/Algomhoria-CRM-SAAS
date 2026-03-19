import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { ProjectsPageClient } from '@/components/landing/ProjectsPageClient'

export const dynamic = 'force-dynamic'

export default function ProjectsPage() {
  const forcedLocale = cookies().get('locale')?.value === 'ar' ? 'ar' : 'en'
  return (
    <Suspense fallback={<div className="container py-5">Loading...</div>}>
      <ProjectsPageClient forcedLocale={forcedLocale} />
    </Suspense>
  )
}
