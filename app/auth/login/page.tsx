'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'
import { ActivityLogger } from '@/lib/utils/activity-logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from '@/hooks/use-translations'
import { useLanguageStore } from '@/store/language-store'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const t = useTranslations()
  const { setUser, setProfile, setLoading } = useAuthStore()
  const { language } = useLanguageStore()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

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

      // Fetch user profile from database
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('email', data.email)
        .single()

      if (profileError || !profile) {
        setError(t('auth.loginError') || 'Invalid credentials or user not found')
        setIsLoading(false)
        return
      }

      // Check user status - prevent inactive or suspended users from logging in
      if (profile.status === 'inactive' || profile.status === 'suspended') {
        const statusMessage = profile.status === 'suspended' 
          ? 'Your account has been suspended. Please contact an administrator.'
          : 'Your account is inactive. Please contact an administrator.'
        setError(statusMessage)
        setIsLoading(false)
        return
      }

      // Update auth store
      setUser(authData.user)
      setProfile({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role as any,
        status: profile.status,
        phone_number: profile.phone_number,
        author_image_url: profile.author_image_url,
      })
      setLoading(false)

      // Log login activity
      await ActivityLogger.login(authData.user.id, authData.user.email || '')

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      setError(t('auth.loginError'))
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.loginTitle')}</CardTitle>
          <CardDescription>{t('common.appName')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.email')}
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('auth.password')}
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('common.loading') : t('auth.login')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

