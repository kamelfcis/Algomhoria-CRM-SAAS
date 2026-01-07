'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect, useLayoutEffect, memo } from 'react'
import dynamic from 'next/dynamic'
import { useThemeStore } from '@/store/theme-store'
import { useLanguageStore } from '@/store/language-store'

// Create query client outside component to prevent recreation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
      networkMode: 'offlineFirst', // Use cache first for faster response
    },
  },
})

// Dynamically import Toaster - not needed for initial render
const Toaster = dynamic(
  () => import('@/components/ui/toaster').then(mod => mod.Toaster),
  { ssr: false }
)

// Use useLayoutEffect on client, useEffect on server
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

// Theme initializer component - applies theme before paint
function ThemeInitializer() {
  const { theme, getResolvedTheme } = useThemeStore()
  const { language } = useLanguageStore()

  useIsomorphicLayoutEffect(() => {
    const resolved = getResolvedTheme()
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(resolved)
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [theme, language, getResolvedTheme])

  return null
}

// Memoized provider to prevent re-renders
export const Providers = memo(function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Render children immediately but hide until mounted to prevent flash
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer />
      <div style={{ visibility: mounted ? 'visible' : 'hidden' }}>
        {children}
      </div>
      {mounted && <Toaster />}
    </QueryClientProvider>
  )
})
