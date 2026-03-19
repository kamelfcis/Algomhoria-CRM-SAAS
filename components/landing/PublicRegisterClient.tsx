'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function getLocaleFromCookie(): 'ar' | 'en' {
  if (typeof document === 'undefined') return 'en'
  const raw = document.cookie
    .split('; ')
    .find((row) => row.startsWith('locale='))
    ?.split('=')[1]
  return raw === 'ar' ? 'ar' : 'en'
}

export function PublicRegisterClient({ forcedLocale }: { forcedLocale?: 'ar' | 'en' }) {
  const router = useRouter()
  const [locale] = useState<'ar' | 'en'>(() => forcedLocale || getLocaleFromCookie())
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const text = useMemo(
    () =>
      locale === 'ar'
        ? {
            title: 'إنشاء حساب',
            subtitle: 'سجل حسابك للمتابعة ونشر عقارك',
            name: 'الاسم',
            email: 'البريد الالكتروني',
            phone: 'رقم الهاتف',
            password: 'كلمة المرور',
            confirmPassword: 'تأكيد كلمة المرور',
            submit: 'تسجيل',
            submitting: 'جاري التسجيل...',
            haveAccount: 'لديك حساب بالفعل؟',
            login: 'تسجيل الدخول',
            passwordMismatch: 'كلمتا المرور غير متطابقتين',
            success: 'تم إنشاء الحساب بنجاح. يمكنك الآن تسجيل الدخول.',
            verificationSent: 'تم إنشاء الحساب. يرجى تأكيد البريد الإلكتروني ثم تسجيل الدخول.',
            brandTitle: 'الجمهورية العقارية',
            brandSubtitle: 'ابدأ رحلتك العقارية معنا',
          }
        : {
            title: 'Register',
            subtitle: 'Create your account to continue and publish your property',
            name: 'Name',
            email: 'Email',
            phone: 'Phone Number',
            password: 'Password',
            confirmPassword: 'Confirm Password',
            submit: 'Register',
            submitting: 'Creating account...',
            haveAccount: 'Already have an account?',
            login: 'Login',
            passwordMismatch: 'Passwords do not match',
            success: 'Account created successfully. You can now login.',
            verificationSent: 'Account created. Please verify your email, then login.',
            brandTitle: 'Algomhoria Real Estate',
            brandSubtitle: 'Start your real estate journey with us',
          },
    [locale]
  )

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (password !== confirmPassword) {
      setError(text.passwordMismatch)
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const normalizedEmail = email.trim().toLowerCase()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { name: name.trim() },
        },
      })

      if (signUpError) {
        setError(signUpError.message || (locale === 'ar' ? 'فشل إنشاء الحساب' : 'Failed to create account'))
        return
      }

      if (data.user) {
        // Sync profile only when a session exists (avoids unauthorized noise when email verification is required).
        if (data.session) {
          await fetch('/api/landing/auth/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name.trim(),
              phone_number: phoneNumber.trim() || undefined,
            }),
          })
        }
      }
      if (!data.session) {
        setSuccessMessage(text.verificationSent)
        router.push(`/login?registered=1&verify=1`)
        return
      }

      router.push('/login?registered=1')
    } catch {
      setError(locale === 'ar' ? 'فشل إنشاء الحساب' : 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-fluid py-4 py-lg-5 auth-shell">
      <div className="container py-3 py-lg-5">
        <div className="row justify-content-center">
          <div className="col-lg-6 col-md-8">
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
                <div className="col-md-6">
                  <label className="form-label">{text.name}</label>
                  <input
                    type="text"
                    className="form-control modern-input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    minLength={2}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">{text.phone}</label>
                  <input
                    type="text"
                    className="form-control modern-input"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    autoComplete="tel"
                  />
                </div>
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
                <div className="col-md-6">
                  <label className="form-label">{text.password}</label>
                  <input
                    type="password"
                    className="form-control modern-input"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">{text.confirmPassword}</label>
                  <input
                    type="password"
                    className="form-control modern-input"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                {error && (
                  <div className="col-12">
                    <div className="landing-contact-status-badge error">{error}</div>
                  </div>
                )}
                {successMessage && (
                  <div className="col-12">
                    <div className="landing-contact-status-badge success">{successMessage}</div>
                  </div>
                )}
                <div className="col-12 d-grid mt-2">
                  <button className="btn btn-primary rounded-pill py-2" type="submit" disabled={loading}>
                    {loading ? text.submitting : text.submit}
                  </button>
                </div>
                <div className="col-12 text-center mt-2">
                  <small className="text-muted">
                    {text.haveAccount}{' '}
                    <Link href="/login" className="text-primary fw-semibold">
                      {text.login}
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
