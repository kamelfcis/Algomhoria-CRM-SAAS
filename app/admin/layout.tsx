'use client'

import { useEffect, useState, Suspense, memo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'
import { usePermissionsStore } from '@/store/permissions-store'
import { useLanguageStore } from '@/store/language-store'
import type { Database } from '@/lib/supabase/types'

type UserProfile = Database['public']['Tables']['users']['Row']

// Dynamic imports for layout components to reduce initial bundle
const Sidebar = dynamic(
  () => import('@/components/layout/sidebar').then(mod => ({ default: mod.Sidebar })),
  { 
    ssr: false,
    loading: () => <div className="hidden lg:block w-72 bg-card/80" />
  }
)

const Navbar = dynamic(
  () => import('@/components/layout/navbar').then(mod => ({ default: mod.Navbar })),
  { 
    ssr: false,
    loading: () => <div className="h-16 bg-card/80 border-b" />
  }
)

// Memoized background component to prevent re-renders
const DashboardBackground = memo(function DashboardBackground() {
  return (
    <>
      {/* Light mode background - static, no animation */}
      <div 
        className="fixed inset-0 -z-10 dark:hidden"
        style={{
          background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 50%, #f8f9fa 100%)',
        }}
      />
      
      {/* Dark mode background - static, no animation */}
      <div 
        className="fixed inset-0 -z-10 hidden dark:block"
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
        }}
      />
    </>
  )
})

// Simple loading spinner
function LoadingSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, profile, loading, setUser, setProfile, setLoading } = useAuthStore()
  const { language } = useLanguageStore()
  const { fetchPermissions } = usePermissionsStore()
  const [profileError, setProfileError] = useState(false)

  useEffect(() => {
    let isMounted = true
    
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
          .select('id, email, name, phone_number, status, author_image_url, created_at, updated_at')
          .eq('email', currentUser.email!)
          .single()

        // If user doesn't exist, create it
        if (error || !userProfile) {
          const insertData: any = {
            id: currentUser.id,
            email: currentUser.email!,
            name: currentUser.user_metadata?.name || currentUser.email!.split('@')[0],
            password_hash: '',
            status: 'active',
          }

          const { data: newUserProfile, error: createError } = await supabase
            .from('users')
            .insert(insertData)
            .select('id, email, name, phone_number, status, author_image_url, created_at, updated_at')
            .single()

          if (createError || !newUserProfile) {
            if (isMounted) {
              setProfileError(true)
              setLoading(false)
            }
            return
          }

          userProfile = newUserProfile

          // Assign default role
          const { data: defaultRole } = await supabase
            .from('roles')
            .select('id')
            .eq('name', 'user')
            .single()

          if (defaultRole) {
            await supabase
              .from('user_roles')
              .insert({
                user_id: currentUser.id,
                role_id: defaultRole.id,
              })
          }
        }

        if (userProfile && isMounted) {
          const profile = userProfile as UserProfile
          
          if (profile.status !== 'active') {
            await supabase.auth.signOut()
            router.push('/auth/login')
            setLoading(false)
            return
          }

          // Fetch user roles
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('role_id, roles!inner(name, status)')
            .eq('user_id', profile.id)

          const activeRole = userRoles?.find((ur: any) => ur.roles?.status === 'active')
          const roleName = (activeRole as any)?.roles?.name || 'user'

          setUser(currentUser)
          setProfile({
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: roleName as any,
            status: profile.status,
            phone_number: profile.phone_number,
            author_image_url: profile.author_image_url,
          })
          setProfileError(false)
          
          // Pre-fetch permissions
          fetchPermissions(profile.id)
        }
      }

      if (isMounted) {
        setLoading(false)
      }
    }

    checkAuth()
    
    return () => {
      isMounted = false
    }
  }, [user, profile, router, setUser, setProfile, setLoading, fetchPermissions])

  if (loading) {
    return <LoadingSpinner />
  }

  if (profileError || !user || !profile) {
    return (
      <div className="flex h-screen items-center justify-center" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-md mx-4">
          <div className="text-destructive text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">User Profile Not Found</h2>
          <p className="text-muted-foreground mb-4">
            Your account exists in authentication but not in the users database.
          </p>
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
      <DashboardBackground />
      <Suspense fallback={<div className="hidden lg:block w-72 bg-card/80" />}>
        <Sidebar />
      </Suspense>
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-0">
        <Suspense fallback={<div className="h-16 bg-card/80 border-b" />}>
          <Navbar />
        </Suspense>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-0">
          {children}
        </main>
      </div>
    </div>
  )
}
