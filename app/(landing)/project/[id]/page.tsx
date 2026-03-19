import { cookies } from 'next/headers'
import { ProjectDetailsClient } from '@/components/landing/ProjectDetailsClient'

export const dynamic = 'force-dynamic'

export default function ProjectPage({
  params,
}: {
  params: { id: string }
}) {
  const forcedLocale = cookies().get('locale')?.value === 'ar' ? 'ar' : 'en'
  return <ProjectDetailsClient id={params.id} forcedLocale={forcedLocale} />
}
