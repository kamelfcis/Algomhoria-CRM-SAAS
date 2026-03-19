'use client'

import LandingLayout from './(landing)/layout'
import HomePageClient from '@/components/landing/HomePageClient'

export default function RootPage() {
  return (
    <LandingLayout>
      <HomePageClient />
    </LandingLayout>
  )
}

