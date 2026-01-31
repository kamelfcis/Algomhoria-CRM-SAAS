'use client'

import LandingPage from './(landing)/page'
import LandingLayout from './(landing)/layout'

export default function RootPage() {
  return (
    <LandingLayout>
      <LandingPage />
    </LandingLayout>
  )
}

