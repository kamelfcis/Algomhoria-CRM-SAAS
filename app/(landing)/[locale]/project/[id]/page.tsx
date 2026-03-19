import { ProjectDetailsClient } from '@/components/landing/ProjectDetailsClient'

export const dynamic = 'force-dynamic'

export default function LocalizedProjectDetailPage({
  params,
}: {
  params: { locale: string; id: string }
}) {
  const locale = params.locale === 'ar' ? 'ar' : 'en'
  return <ProjectDetailsClient id={params.id} forcedLocale={locale} />
}
