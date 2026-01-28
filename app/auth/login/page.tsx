'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'
import { usePermissionsStore } from '@/store/permissions-store'
import { ActivityLogger } from '@/lib/utils/activity-logger'
import type { Database } from '@/lib/supabase/types'

type UserProfile = Database['public']['Tables']['users']['Row']
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from '@/hooks/use-translations'
import { useLanguageStore } from '@/store/language-store'

// Flag Icon Components
const EnglishFlag = () => (
  <svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-sm">
    <rect width="24" height="18" fill="#012169" rx="1"/>
    <path d="M0 0L24 18M24 0L0 18" stroke="white" strokeWidth="2.4"/>
    <path d="M0 0L24 18M24 0L0 18" stroke="#C8102E" strokeWidth="1.6"/>
    <path d="M12 0V18M0 9H24" stroke="white" strokeWidth="3.2"/>
    <path d="M12 0V18M0 9H24" stroke="#C8102E" strokeWidth="2.4"/>
  </svg>
)

const ArabicFlag = () => (
  <svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-sm">
    {/* Red stripe */}
    <rect width="24" height="6" fill="#CE1126" rx="1"/>
    {/* White stripe */}
    <rect y="6" width="24" height="6" fill="#FFFFFF" rx="0"/>
    {/* Black stripe */}
    <rect y="12" width="24" height="6" fill="#000000" rx="1"/>
    {/* Simplified Eagle of Saladin in center */}
    <circle cx="12" cy="9" r="2.5" fill="#C8102E" opacity="0.8"/>
    <path d="M10.5 8.5L12 7L13.5 8.5L12 10L10.5 8.5Z" fill="#FFD700"/>
  </svg>
)

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const t = useTranslations()
  const { setUser, setProfile, setLoading } = useAuthStore()
  const { fetchPermissions } = usePermissionsStore()
  const { language, setLanguage } = useLanguageStore()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en')
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        setError(t('auth.loginError'))
        setIsLoading(false)
        return
      }

      if (!authData.user) {
        setError(t('auth.loginError'))
        setIsLoading(false)
        return
      }

      // Fetch user profile from database (excluding role column)
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, email, name, phone_number, status, author_image_url, created_at, updated_at')
        .eq('email', data.email)
        .single()

      if (profileError || !profile) {
        setError(t('auth.loginError') || 'Invalid credentials or user not found')
        setIsLoading(false)
        return
      }

      const userProfile = profile as any

      // Check user status - prevent inactive or suspended users from logging in
      if (userProfile.status === 'inactive' || userProfile.status === 'suspended') {
        const statusMessage = userProfile.status === 'suspended' 
          ? 'Your account has been suspended. Please contact an administrator.'
          : 'Your account is inactive. Please contact an administrator.'
        setError(statusMessage)
        setIsLoading(false)
        return
      }

      // Fetch user roles
      const { data: userRoles } = await (supabase as any)
        .from('user_roles')
        .select(`
          role_id,
          roles!inner(name, status)
        `)
        .eq('user_id', userProfile.id)

      // Get the first active role (or default to 'user')
      const activeRole = userRoles?.find((ur: any) => ur.roles?.status === 'active')
      const roleName = (activeRole as any)?.roles?.name || 'user'

      // Update auth store
      setUser(authData.user)
      setProfile({
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        role: roleName as any,
        status: userProfile.status,
        phone_number: userProfile.phone_number,
        author_image_url: userProfile.author_image_url,
      })
      setLoading(false)

      // Pre-fetch permissions immediately after login for instant page loads
      fetchPermissions(userProfile.id)

      // Log login activity (don't await - let it run in background)
      ActivityLogger.login(authData.user.id, authData.user.email || '')

      // Redirect to admin
      router.push('/admin')
    } catch (err) {
      setError(t('auth.loginError'))
      setIsLoading(false)
    }
  }

  // Generate particles once
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: Math.random() * 4 + 4,
      delay: Math.random() * 2,
    }))
  }, [])

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" 
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
        backgroundSize: '300% 300%',
        animation: 'gradient 8s ease infinite',
      }}
    >
      {/* Animated gradient background */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(135deg, #af7818 0%, #d19c15 50%, #fac708 100%)',
          backgroundSize: '300% 300%',
          animation: 'gradient 8s ease infinite',
          filter: 'blur(80px)',
        }}
      />
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full opacity-20"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              background: `linear-gradient(135deg, #fac708, #d19c15)`,
              animation: `float ${particle.duration}s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Language Toggle Button */}
      <div className={`absolute top-4 z-20 ${language === 'ar' ? 'left-4' : 'right-4'}`}>
        <Button
          onClick={toggleLanguage}
          variant="ghost"
          className="rounded-lg backdrop-blur-xl bg-black/40 border-2 border-gold-dark/30 hover:border-gold-light/50 transition-all duration-300 hover:scale-105 px-3 py-2 h-auto"
          style={{
            boxShadow: '0 4px 12px rgba(250, 199, 8, 0.2)',
          }}
        >
          <div className="flex items-center gap-2">
            {language === 'en' ? (
              <>
                <ArabicFlag />
                <span className="text-sm font-semibold text-gold-light">العربية</span>
              </>
            ) : (
              <>
                <EnglishFlag />
                <span className="text-sm font-semibold text-gold-light">English</span>
              </>
            )}
          </div>
        </Button>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo and Brand */}
        <div className="flex flex-col items-center mb-8 space-y-4">
          {/* Logo */}
          <div className="flex justify-center animate-float">
            <div className="relative w-[120px] h-[120px] flex items-center justify-center">
              <div 
                className="absolute rounded-full blur-xl opacity-50 -z-0"
                style={{
                  background: 'linear-gradient(135deg, #fac708, #d19c15)',
                  animation: 'glow 2s ease-in-out infinite',
                  width: '140px',
                  height: '140px',
                  left: '0',
                  right: '0',
                  top: '0',
                  bottom: '0',
                  margin: 'auto',
                }}
              />
              <div className="relative z-10 w-full h-full flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="ALGOMHORIA Logo"
                  width={120}
                  height={120}
                  className="drop-shadow-2xl w-full h-full object-contain"
                  priority
                />
              </div>
            </div>
          </div>
          
          {/* Brand Name */}
          <div className="text-center space-y-2">
            <h1 
              className="text-3xl font-bold uppercase tracking-wider"
              style={{ color: '#9ca3af' }}
            >
              ALGOMHORIA
            </h1>
            <p 
              className="text-lg font-semibold uppercase tracking-wider"
              style={{
                background: 'linear-gradient(135deg, #fac708, #d19c15)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              A NEW ERA OF PROPERTY
            </p>
          </div>
        </div>

        {/* Glassmorphism Card */}
        <Card 
          className="w-full backdrop-blur-xl bg-black/40 border-2"
          style={{
            borderColor: 'rgba(250, 199, 8, 0.3)',
            boxShadow: '0 8px 32px rgba(250, 199, 8, 0.1), 0 0 0 1px rgba(250, 199, 8, 0.1) inset',
          }}
        >
          <CardHeader className="text-center space-y-2">
            <CardTitle 
              className="text-3xl font-bold bg-gradient-to-r from-gold-light via-gold to-gold-dark bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, #fac708, #d19c15, #af7818)',
              }}
            >
              {t('auth.loginTitle')}
            </CardTitle>
            <CardDescription className="text-gold-light/80 text-lg">
              {t('common.appName')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div 
                  className="p-4 text-sm text-white rounded-lg border backdrop-blur-sm"
                  style={{
                    background: 'rgba(220, 38, 38, 0.2)',
                    borderColor: 'rgba(220, 38, 38, 0.5)',
                  }}
                >
                  {error}
                </div>
              )}
              
              <div className="space-y-3">
                <Label 
                  htmlFor="email" 
                  className="text-gold-light font-semibold"
                >
                  {t('auth.email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.email')}
                  {...register('email')}
                  disabled={isLoading}
                  className="bg-black/30 border-gold-dark/50 text-white placeholder:text-gray-500 focus-visible:border-gold-light focus-visible:ring-gold-light/50 transition-all duration-300"
                  style={{
                    '--tw-ring-color': 'rgba(250, 199, 8, 0.3)',
                  } as React.CSSProperties}
                />
                {errors.email && (
                  <p className="text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label 
                  htmlFor="password" 
                  className="text-gold-light font-semibold"
                >
                  {t('auth.password')}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('auth.password')}
                  {...register('password')}
                  disabled={isLoading}
                  className="bg-black/30 border-gold-dark/50 text-white placeholder:text-gray-500 focus-visible:border-gold-light focus-visible:ring-gold-light/50 transition-all duration-300"
                  style={{
                    '--tw-ring-color': 'rgba(250, 199, 8, 0.3)',
                  } as React.CSSProperties}
                />
                {errors.password && (
                  <p className="text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full mt-8 text-black font-bold text-lg py-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                disabled={isLoading}
                style={{
                  background: 'linear-gradient(135deg, #fac708, #d19c15, #af7818)',
                  boxShadow: '0 4px 20px rgba(250, 199, 8, 0.4)',
                }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    {t('common.loading')}
                  </span>
                ) : (
                  t('auth.login')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

