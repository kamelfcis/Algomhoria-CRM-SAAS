'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type Locale = 'ar' | 'en'

interface BookingRow {
  id: string
  property_id: string
  booking_from_date: string
  booking_to_date: string
  status: string
  total_price: number
  created_at: string | null
  property: {
    code: string
    title: string
    location: string
    image_url: string | null
  } | null
}

function getLocaleFromCookie(): Locale {
  if (typeof document === 'undefined') return 'en'
  const raw = document.cookie
    .split('; ')
    .find((row) => row.startsWith('locale='))
    ?.split('=')[1]
  return raw === 'ar' ? 'ar' : 'en'
}

function formatDate(value: string, locale: Locale) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date)
}

export function MyBookingsPageClient({ forcedLocale }: { forcedLocale?: Locale }) {
  const [locale] = useState<Locale>(() => forcedLocale || getLocaleFromCookie())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<BookingRow[]>([])

  const text = useMemo(
    () =>
      locale === 'ar'
        ? {
            title: 'حجوزاتي',
            subtitle: 'متابعة طلبات الحجز الخاصة بك',
            empty: 'لا توجد حجوزات حتى الآن',
            from: 'من',
            to: 'إلى',
            status: 'الحالة',
            total: 'الإجمالي',
            createdAt: 'تاريخ الطلب',
            openListing: 'عرض العقار',
            pending: 'قيد المراجعة',
            confirmed: 'مؤكد',
            cancelled: 'ملغي',
            rejected: 'مرفوض',
          }
        : {
            title: 'My Bookings',
            subtitle: 'Track your booking requests',
            empty: 'No bookings yet',
            from: 'From',
            to: 'To',
            status: 'Status',
            total: 'Total',
            createdAt: 'Requested At',
            openListing: 'Open Listing',
            pending: 'Pending',
            confirmed: 'Confirmed',
            cancelled: 'Cancelled',
            rejected: 'Rejected',
          },
    [locale]
  )

  const statusLabel = (value: string) => {
    const normalized = String(value || '').toLowerCase()
    if (normalized === 'confirmed') return text.confirmed
    if (normalized === 'cancelled') return text.cancelled
    if (normalized === 'rejected') return text.rejected
    return text.pending
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/landing/my-bookings?locale=${locale}`, { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload?.error || 'Failed to load bookings')
        if (!cancelled) setRows(Array.isArray(payload?.data) ? payload.data : [])
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load bookings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [locale])

  return (
    <div className="container-fluid py-4 py-lg-5 auth-shell">
      <div className="container py-3 py-lg-5">
        <div className="row justify-content-center">
          <div className="col-xl-10 col-lg-11">
            <div className="property-panel auth-panel p-3 p-sm-4 p-lg-5">
              <div className="auth-brand">
                <img src="/logo.png" alt="Algomhoria Logo" className="auth-brand-logo" />
                <div>
                  <p className="auth-brand-title">{text.title}</p>
                  <p className="auth-brand-subtitle">{text.subtitle}</p>
                </div>
              </div>

              {loading && <p className="text-muted mb-0">Loading...</p>}
              {!loading && error && <div className="landing-contact-status-badge error">{error}</div>}
              {!loading && !error && rows.length === 0 && (
                <div className="landing-contact-status-badge warning">{text.empty}</div>
              )}

              {!loading && !error && rows.length > 0 && (
                <div className="row g-3">
                  {rows.map((row) => (
                    <div className="col-12" key={row.id}>
                      <div className="my-property-card">
                        <div className="d-flex flex-column flex-md-row gap-3">
                          <img
                            src={row.property?.image_url || '/landing/img/feature-2.jpg'}
                            alt={row.property?.title || 'Property'}
                            style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 12, flexShrink: 0 }}
                            onError={(event) => {
                              ;(event.currentTarget as HTMLImageElement).src = '/landing/img/feature-2.jpg'
                            }}
                          />
                          <div className="flex-grow-1">
                            <h6 className="mb-1">{row.property?.title || '-'}</h6>
                            <p className="text-muted mb-2" style={{ fontSize: '0.88rem' }}>
                              {row.property?.location || '-'}
                            </p>
                            <div className="my-property-meta">
                              <span>
                                {text.from}: {formatDate(row.booking_from_date, locale)}
                              </span>
                              <span>
                                {text.to}: {formatDate(row.booking_to_date, locale)}
                              </span>
                              <span>
                                {text.total}: {Number(row.total_price || 0).toLocaleString()} EGP
                              </span>
                              <span>
                                {text.createdAt}: {formatDate(row.created_at || '', locale)}
                              </span>
                            </div>
                          </div>
                          <div className="d-flex flex-column align-items-start align-items-md-end gap-2">
                            <span className={`my-property-status-chip ${String(row.status || '').toLowerCase()}`}>
                              {statusLabel(row.status)}
                            </span>
                            {row.property?.code ? (
                              <Link
                                href={`/listing/${encodeURIComponent(row.property.code)}`}
                                className="btn btn-outline-primary btn-sm rounded-pill px-3"
                              >
                                {text.openListing}
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
