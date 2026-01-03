'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'
import { Sidebar } from '@/components/layout/sidebar'
import { Navbar } from '@/components/layout/navbar'
import { useLanguageStore } from '@/store/language-store'
import type { Database } from '@/lib/supabase/types'

type UserProfile = Database['public']['Tables']['users']['Row']

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
        let { data: userProfile, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', currentUser.email!)
          .single()

        // If user doesn't exist, automatically create it
        if (error || !userProfile) {
          console.warn('User profile not found, creating automatically...', error)
          
          // Create user profile automatically
          const insertData: any = {
            id: currentUser.id,
            email: currentUser.email!,
            name: currentUser.user_metadata?.name || currentUser.email!.split('@')[0],
            role: 'sales', // Default role
            status: 'active',
          }

          const { data: newUserProfile, error: createError } = await supabase
            .from('users')
            .insert(insertData)
            .select()
            .single()

          if (createError || !newUserProfile) {
            console.error('Failed to create user profile:', createError)
            setProfileError(true)
            setLoading(false)
            return
          }

          userProfile = newUserProfile
        }

        if (userProfile) {
          const profile = userProfile as UserProfile
          
          // Check if user status is active - if not, log them out
          if (profile.status !== 'active') {
            // User is inactive or suspended, sign them out
            await supabase.auth.signOut()
            router.push('/auth/login')
            setLoading(false)
            return
          }

          setUser(currentUser)
          setProfile({
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role as any,
            status: profile.status,
            phone_number: profile.phone_number,
            author_image_url: profile.author_image_url,
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
    <div 
      className="flex h-screen overflow-hidden relative" 
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Modern light mode background */}
      <div 
        className="fixed inset-0 -z-10 dark:hidden"
        style={{
          background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 25%, #f5f7fa 50%, #ffffff 75%, #f8f9fa 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradient 15s ease infinite',
        }}
      />
      
      {/* Subtle gold accent in light mode */}
      <div 
        className="fixed inset-0 -z-10 dark:hidden opacity-5"
        style={{
          background: 'radial-gradient(circle at 20% 50%, rgba(250, 199, 8, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(209, 156, 21, 0.2) 0%, transparent 50%)',
        }}
      />
      
      {/* Futuristic dark mode background gradient */}
      <div 
        className="fixed inset-0 -z-10 hidden dark:block opacity-30"
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 25%, #0f0f0f 50%, #1a1a1a 75%, #0a0a0a 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradient 15s ease infinite',
        }}
      />
      
      {/* Gold gradient overlay for dark mode */}
      <div 
        className="fixed inset-0 -z-10 hidden dark:block opacity-20"
        style={{
          background: 'linear-gradient(135deg, #af7818 0%, #d19c15 50%, #fac708 100%)',
          backgroundSize: '300% 300%',
          animation: 'gradient 8s ease infinite',
        }}
      />
      
      {/* Animated particles background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-5 dark:opacity-20"
            style={{
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `linear-gradient(135deg, #fac708, #d19c15)`,
              animation: `float ${Math.random() * 4 + 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-0">
          {children}
        </main>
      </div>
    </div>
  )
}

