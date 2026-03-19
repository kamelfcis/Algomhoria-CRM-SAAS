'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Locale = 'ar' | 'en'

interface ProfilePayload {
  id: string
  email: string
  name: string
  phone_number?: string | null
  author_image_url?: string | null
  status?: string
}

function getLocaleFromCookie(): Locale {
  if (typeof document === 'undefined') return 'en'
  const raw = document.cookie
    .split('; ')
    .find((row) => row.startsWith('locale='))
    ?.split('=')[1]
  return raw === 'ar' ? 'ar' : 'en'
}

export function ProfilePageClient({ forcedLocale }: { forcedLocale?: Locale }) {
  const router = useRouter()
  const [locale] = useState<Locale>(() => forcedLocale || getLocaleFromCookie())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [profile, setProfile] = useState<ProfilePayload | null>(null)
  const [name, setName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null)

  const text = useMemo(
    () =>
      locale === 'ar'
        ? {
            title: 'الملف الشخصي',
            subtitle: 'إدارة بيانات الحساب والأمان',
            name: 'الاسم',
            email: 'البريد الإلكتروني',
            phone: 'رقم الهاتف',
            avatar: 'رابط الصورة الشخصية',
            saveProfile: 'حفظ البيانات',
            saving: 'جاري الحفظ...',
            security: 'تغيير كلمة المرور',
            newPassword: 'كلمة المرور الجديدة',
            confirmPassword: 'تأكيد كلمة المرور',
            savePassword: 'تحديث كلمة المرور',
            updatingPassword: 'جاري التحديث...',
            logout: 'تسجيل الخروج',
            loadError: 'تعذر تحميل الملف الشخصي',
            profileSaved: 'تم حفظ البيانات بنجاح',
            passwordSaved: 'تم تحديث كلمة المرور بنجاح',
            passwordMismatch: 'كلمتا المرور غير متطابقتين',
          }
        : {
            title: 'Profile',
            subtitle: 'Manage your account details and security',
            name: 'Name',
            email: 'Email',
            phone: 'Phone Number',
            avatar: 'Avatar URL',
            saveProfile: 'Save Profile',
            saving: 'Saving...',
            security: 'Change Password',
            newPassword: 'New Password',
            confirmPassword: 'Confirm Password',
            savePassword: 'Update Password',
            updatingPassword: 'Updating...',
            logout: 'Logout',
            loadError: 'Failed to load profile',
            profileSaved: 'Profile updated successfully',
            passwordSaved: 'Password updated successfully',
            passwordMismatch: 'Passwords do not match',
          },
    [locale]
  )

  const loadProfile = async () => {
    setLoading(true)
    setStatus(null)
    try {
      const response = await fetch('/api/landing/auth/profile', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || text.loadError)
      const nextProfile = payload.data as ProfilePayload
      setProfile(nextProfile)
      setName(nextProfile.name || '')
      setPhoneNumber(nextProfile.phone_number || '')
      setAvatarUrl(nextProfile.author_image_url || '')
    } catch (error: any) {
      setStatus({ type: 'error', message: error?.message || text.loadError })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submitProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus(null)
    setSaving(true)
    try {
      const response = await fetch('/api/landing/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone_number: phoneNumber.trim() || undefined,
          author_image_url: avatarUrl.trim() || null,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Failed to update profile')
      setStatus({ type: 'success', message: text.profileSaved })
      loadProfile()
    } catch (error: any) {
      setStatus({ type: 'error', message: error?.message || 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  const submitPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus(null)
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'warning', message: text.passwordMismatch })
      return
    }
    setPasswordSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setStatus({ type: 'success', message: text.passwordSaved })
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      setStatus({ type: 'error', message: error?.message || 'Failed to update password' })
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="container-fluid py-4 py-lg-5 auth-shell">
      <div className="container py-3 py-lg-5">
        <div className="row justify-content-center">
          <div className="col-xl-8 col-lg-9">
            <div className="property-panel auth-panel p-3 p-sm-4 p-lg-5">
              <div className="auth-brand">
                <img src="/logo.png" alt="Algomhoria Logo" className="auth-brand-logo" />
                <div>
                  <p className="auth-brand-title">{text.title}</p>
                  <p className="auth-brand-subtitle">{text.subtitle}</p>
                </div>
              </div>

              {loading ? (
                <p className="text-muted mb-0">Loading...</p>
              ) : (
                <>
                  <form className="row g-3 mb-4" onSubmit={submitProfile}>
                    <div className="col-md-6">
                      <label className="form-label">{text.name}</label>
                      <input className="form-control modern-input" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">{text.email}</label>
                      <input className="form-control modern-input" value={profile?.email || ''} disabled readOnly />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">{text.phone}</label>
                      <input className="form-control modern-input" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">{text.avatar}</label>
                      <input className="form-control modern-input" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
                    </div>
                    <div className="col-12 d-grid d-md-flex justify-content-md-end">
                      <button className="btn btn-primary rounded-pill px-4" type="submit" disabled={saving}>
                        {saving ? text.saving : text.saveProfile}
                      </button>
                    </div>
                  </form>

                  <div className="profile-security-block">
                    <h5 className="mb-3">{text.security}</h5>
                    <form className="row g-3" onSubmit={submitPassword}>
                      <div className="col-md-6">
                        <label className="form-label">{text.newPassword}</label>
                        <input
                          type="password"
                          className="form-control modern-input"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          minLength={6}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">{text.confirmPassword}</label>
                        <input
                          type="password"
                          className="form-control modern-input"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          minLength={6}
                          required
                        />
                      </div>
                      <div className="col-12 d-grid d-md-flex justify-content-md-between gap-2">
                        <button className="btn btn-outline-danger rounded-pill px-4" type="button" onClick={handleLogout}>
                          {text.logout}
                        </button>
                        <button className="btn btn-primary rounded-pill px-4" type="submit" disabled={passwordSaving}>
                          {passwordSaving ? text.updatingPassword : text.savePassword}
                        </button>
                      </div>
                    </form>
                  </div>
                </>
              )}

              {status && (
                <div className={`landing-contact-status-badge ${status.type} mt-3`}>
                  {status.message}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
