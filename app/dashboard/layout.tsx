'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'
import { Sidebar } from '@/components/layout/sidebar'
import { Navbar } from '@/components/layout/navbar'
import { useLanguageStore } from '@/store/language-store'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, profile, loading, setUser, setProfile, setLoading } = useAuthStore()
  const { language } = useLanguageStore()
  const [profileError, setProfileError] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      if (!currentUser) {
        router.push('/auth/login')
        return
      }

      if (!user || !profile) {
        // Fetch user profile
        const { data: userProfile, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', currentUser.email!)
          .single()

        if (error || !userProfile) {
          // User doesn't exist in users table - show error message
          console.error('User profile not found:', error)
          setProfileError(true)
          setLoading(false)
          return
        }

        if (userProfile) {
          // Check if user status is active - if not, log them out
          if (userProfile.status !== 'active') {
            // User is inactive or suspended, sign them out
            await supabase.auth.signOut()
            router.push('/auth/login')
            setLoading(false)
            return
          }

          setUser(currentUser)
          setProfile({
            id: userProfile.id,
            email: userProfile.email,
            name: userProfile.name,
            role: userProfile.role as any,
            status: userProfile.status,
            phone_number: userProfile.phone_number,
            author_image_url: userProfile.author_image_url,
          })
          setProfileError(false)
        }
      }

      setLoading(false)
    }

    checkAuth()
  }, [user, profile, router, setUser, setProfile, setLoading])

  // Show loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show error if profile not found
  if (profileError || (!user || !profile)) {
    return (
      <div className="flex h-screen items-center justify-center" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-md mx-4">
          <div className="text-destructive text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">User Profile Not Found</h2>
          <p className="text-muted-foreground mb-4">
            Your account exists in authentication but not in the users database.
          </p>
          <div className="bg-muted p-4 rounded-lg text-left text-sm space-y-2 mb-4">
            <p className="font-semibold">To fix this:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Go to Supabase Dashboard → SQL Editor</li>
              <li>Run the <code className="bg-background px-1 rounded">supabase_sync_users.sql</code> script</li>
              <li>Refresh this page</li>
            </ol>
          </div>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

