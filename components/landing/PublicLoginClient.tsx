'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function getLocaleFromCookie(): 'ar' | 'en' {
  if (typeof document === 'undefined') return 'en'
  const raw = document.cookie
    .split('; ')
    .find((row) => row.startsWith('locale='))
    ?.split('=')[1]
  return raw === 'ar' ? 'ar' : 'en'
}

export function PublicLoginClient({ forcedLocale }: { forcedLocale?: 'ar' | 'en' }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [locale] = useState<'ar' | 'en'>(() => forcedLocale || getLocaleFromCookie())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const text = useMemo(
    () =>
      locale === 'ar'
        ? {
            title: 'تسجيل الدخول',
            subtitle: 'ادخل بياناتك للوصول إلى حسابك',
            email: 'البريد الالكتروني',
            password: 'كلمة المرور',
            submit: 'دخول',
            submitting: 'جاري الدخول...',
            noAccount: 'ليس لديك حساب؟',
            createAccount: 'إنشاء حساب',
            registeredSuccess: 'تم إنشاء الحساب بنجاح. يمكنك تسجيل الدخول الآن.',
            verifyRequired:
              'تم إنشاء الحساب ولكن يلزم تأكيد البريد الإلكتروني قبل تسجيل الدخول. تم إرسال رابط التفعيل.',
            emailNotConfirmed:
              'البريد الإلكتروني غير مؤكد بعد. يرجى فتح رسالة التفعيل ثم إعادة المحاولة.',
            brandTitle: 'الجمهورية العقارية',
            brandSubtitle: 'خبرة عقارية موثوقة منذ سنوات',
          }
        : {
            title: 'Login',
            subtitle: 'Sign in to access your account',
            email: 'Email',
            password: 'Password',
            submit: 'Login',
            submitting: 'Signing in...',
            noAccount: "Don't have an account?",
            createAccount: 'Register',
            registeredSuccess: 'Account created successfully. You can login now.',
            verifyRequired:
              'Account created, but email verification is required before login. A verification email has been sent.',
            emailNotConfirmed:
              'Email is not confirmed yet. Please verify your email first, then try again.',
            brandTitle: 'Algomhoria Real Estate',
            brandSubtitle: 'Trusted real estate expertise',
          },
    [locale]
  )

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (signInError || !data.user) {
        const errorMessage = String(signInError?.message || '')
        const isEmailNotConfirmed = /email.*not.*confirmed/i.test(errorMessage)

        if (isEmailNotConfirmed) {
          await supabase.auth.resend({
            type: 'signup',
            email: email.trim().toLowerCase(),
          }).catch(() => undefined)
          setError(text.emailNotConfirmed)
          return
        }

        setError(
          /invalid login credentials/i.test(errorMessage)
            ? locale === 'ar'
              ? 'بيانات الدخول غير صحيحة'
              : 'Invalid login credentials'
            : errorMessage || (locale === 'ar' ? 'حدث خطأ أثناء تسجيل الدخول' : 'Failed to login')
        )
        return
      }

      // Best-effort profile provisioning without noisy logging.
      await fetch('/api/landing/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const next = searchParams.get('next')
      router.push(next && next.startsWith('/') ? next : '/')
    } catch {
      setError(locale === 'ar' ? 'حدث خطأ أثناء تسجيل الدخول' : 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-fluid py-4 py-lg-5 auth-shell">
      <div className="container py-3 py-lg-5">
        <div className="row justify-content-center">
          <div className="col-lg-5 col-md-7">
            <div className="property-panel auth-panel p-3 p-sm-4 p-lg-5">
              <div className="auth-brand">
                <img src="/logo.png" alt="Algomhoria Logo" className="auth-brand-logo" />
                <div>
                  <p className="auth-brand-title">{text.brandTitle}</p>
                  <p className="auth-brand-subtitle">{text.brandSubtitle}</p>
                </div>
              </div>
              <h2 className="mb-2">{text.title}</h2>
              <p className="text-muted mb-4">{text.subtitle}</p>

              <form className="row g-3" onSubmit={handleSubmit}>
                {searchParams.get('registered') === '1' && (
                  <div className="col-12">
                    <div className="landing-contact-status-badge success">{text.registeredSuccess}</div>
                  </div>
                )}
                {searchParams.get('verify') === '1' && (
                  <div className="col-12">
                    <div className="landing-contact-status-badge warning">{text.verifyRequired}</div>
                  </div>
                )}
                <div className="col-12">
                  <label className="form-label">{text.email}</label>
                  <input
                    type="email"
                    className="form-control modern-input"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">{text.password}</label>
                  <input
                    type="password"
                    className="form-control modern-input"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                    minLength={6}
                  />
                </div>
                {error && (
                  <div className="col-12">
                    <div className="landing-contact-status-badge error">{error}</div>
                  </div>
                )}
                <div className="col-12 d-grid mt-2">
                  <button className="btn btn-primary rounded-pill py-2" type="submit" disabled={loading}>
                    {loading ? text.submitting : text.submit}
                  </button>
                </div>
                <div className="col-12 text-center mt-2">
                  <small className="text-muted">
                    {text.noAccount}{' '}
                    <Link href="/register" className="text-primary fw-semibold">
                      {text.createAccount}
                    </Link>
                  </small>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
