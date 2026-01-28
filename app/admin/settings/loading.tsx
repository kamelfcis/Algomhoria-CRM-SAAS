import { PageSkeleton } from '@/components/ui/page-skeleton'

export default function SettingsLoading() {
  return <PageSkeleton showTable={false} showCards cardCount={2} />
}

