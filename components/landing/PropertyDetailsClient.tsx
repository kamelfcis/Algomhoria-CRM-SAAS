'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { LandingDetailsSkeleton } from '@/components/landing/LandingSkeletons'
import { DateRangePicker } from '@/components/landing/DateRangePicker'

interface PropertyDetails {
  id: string
  code: string
  title: string
  location: string
  property_type: string
  section: string
  view_type: string
  price: number
  size: number
  baths: number
  beds: number
  description: string
  is_featured: boolean
  images: string[]
  services: string[]
  facilities: string[]
}

type ContactStatusType = 'success' | 'warning' | 'error'
type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'unavailable' | 'error'

function SafeImage({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src || '/landing/img/feature-2.jpg'}
      alt={alt}
      className="img-fluid rounded"
      style={{ width: '100%', height: 460, objectFit: 'cover' }}
      onError={(e) => {
        ;(e.currentTarget as HTMLImageElement).src = '/landing/img/feature-2.jpg'
      }}
    />
  )
}

export function PropertyDetailsClient({
  code,
  forcedLocale,
}: {
  code: string
  forcedLocale?: 'ar' | 'en'
}) {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PropertyDetails | null>(null)
  const [activeImage, setActiveImage] = useState(0)
  const [locale, setLocale] = useState<'ar' | 'en'>(forcedLocale || 'en')
  const [bookingFromDate, setBookingFromDate] = useState('')
  const [bookingToDate, setBookingToDate] = useState('')
  const [contactSubmitting, setContactSubmitting] = useState(false)
  const [contactStatus, setContactStatus] = useState<{ type: ContactStatusType; message: string } | null>(null)
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>('idle')
  const [availabilityMessage, setAvailabilityMessage] = useState('')

  useEffect(() => {
    const cookieLocale = typeof document !== 'undefined'
      ? (document.cookie
          .split('; ')
          .find((x) => x.startsWith('locale='))
          ?.split('=')[1] === 'ar'
        ? 'ar'
        : 'en')
      : 'en'
    const finalLocale = forcedLocale || cookieLocale
    setLocale(finalLocale)
    const fromParam = searchParams.get('bookingFromDate') || ''
    const toParam = searchParams.get('bookingToDate') || ''
    const today = new Date().toISOString().slice(0, 10)
    setBookingFromDate(fromParam || today)
    setBookingToDate(toParam || fromParam || today)

    const run = async () => {
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), 12000)
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/landing/properties/${code}?locale=${finalLocale}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload?.error || 'Failed to load property')
        setData(payload.data)
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          setError(
            finalLocale === 'ar'
              ? 'انتهت مهلة التحميل. حاول مرة اخرى.'
              : 'Loading timed out. Please try again.'
          )
          return
        }
        setError(err?.message || 'Failed to load property')
      } finally {
        window.clearTimeout(timeoutId)
        setLoading(false)
      }
    }

    run()
  }, [code, forcedLocale, searchParams])
  const text = locale === 'ar'
    ? {
        description: 'الوصف',
        location: 'الموقع',
        propertyType: 'نوع العقار',
        section: 'القسم',
        view: 'الاطلالة',
        beds: 'الغرف',
        baths: 'الحمامات',
        size: 'المساحة',
        code: 'الكود',
        services: 'الخدمات',
        facilities: 'المرافق',
        contactOwner: 'تواصل مع المالك',
        name: 'الاسم',
        email: 'البريد الالكتروني',
        phone: 'الهاتف',
        sendRequest: 'ارسل طلب التواصل',
        sending: 'جاري الارسال...',
        fromDate: 'من تاريخ',
        toDate: 'إلى تاريخ',
        invalidDateRange: 'تاريخ النهاية يجب أن يكون بعد أو مساوي لتاريخ البداية',
        helperInvalidDates: 'يرجى اختيار نطاق تاريخ صالح لتفعيل زر الإرسال',
        checkingAvailability: 'جاري التحقق من التوفر...',
        availableRange: 'العقار متاح في الفترة المحددة',
        unavailableRange: 'العقار غير متاح في الفترة المحددة، اختر تاريخا آخر',
        availabilityError: 'تعذر التحقق من التوفر الآن، حاول مرة أخرى',
        genericError: 'فشل ارسال طلب التواصل',
        requestSuccess: 'تم ارسال طلب التواصل بنجاح',
        m2: 'متر مربع',
      }
    : {
        description: 'Description',
        location: 'Location',
        propertyType: 'Property Type',
        section: 'Section',
        view: 'View',
        beds: 'Beds',
        baths: 'Baths',
        size: 'Size',
        code: 'Code',
        services: 'Services',
        facilities: 'Facilities',
        contactOwner: 'Contact Owner',
        name: 'Name',
        email: 'Email',
        phone: 'Phone',
        sendRequest: 'Send Contact Request',
        sending: 'Sending...',
        fromDate: 'Date From',
        toDate: 'Date To',
        invalidDateRange: 'End date must be greater than or equal to start date',
        helperInvalidDates: 'Please choose valid dates to enable submit',
        checkingAvailability: 'Checking availability...',
        availableRange: 'Property is available for selected dates',
        unavailableRange: 'This property is not available for selected dates. Please choose another range.',
        availabilityError: 'Unable to verify availability right now. Please try again.',
        genericError: 'Failed to submit request',
        requestSuccess: 'Contact request sent successfully',
        m2: 'm2',
      }

  const isDateRangeValid =
    Boolean(bookingFromDate) &&
    Boolean(bookingToDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(bookingFromDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(bookingToDate) &&
    bookingFromDate <= bookingToDate

  useEffect(() => {
    if (!data) return
    if (!bookingFromDate || !bookingToDate) {
      setAvailabilityStatus('idle')
      setAvailabilityMessage('')
      return
    }
    if (!isDateRangeValid) {
      setAvailabilityStatus('idle')
      setAvailabilityMessage('')
      return
    }

    setAvailabilityStatus('checking')
    setAvailabilityMessage(text.checkingAvailability)
    let cancelled = false
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          propertyId: data.id,
          bookingFromDate,
          bookingToDate,
        })
        const response = await fetch(`/api/landing/bookings/availability?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => null)
        if (cancelled) return

        if (!response.ok) {
          setAvailabilityStatus('error')
          setAvailabilityMessage(payload?.error || text.availabilityError)
          return
        }

        if (payload?.available === false) {
          setAvailabilityStatus('unavailable')
          setAvailabilityMessage(text.unavailableRange)
          return
        }

        setAvailabilityStatus('available')
        setAvailabilityMessage(text.availableRange)
      } catch (error: any) {
        if (cancelled || error?.name === 'AbortError') return
        setAvailabilityStatus('error')
        setAvailabilityMessage(text.availabilityError)
      }
    }, 320)

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [data, bookingFromDate, bookingToDate, isDateRangeValid, text.checkingAvailability, text.availableRange, text.unavailableRange, text.availabilityError])

  useEffect(() => {
    // Prevent stale availability badges when navigating between listings.
    setAvailabilityStatus('idle')
    setAvailabilityMessage('')
  }, [data?.id])

  useEffect(() => {
    if (contactStatus?.type !== 'success') return
    const hideTimer = window.setTimeout(() => setContactStatus(null), 3200)
    return () => window.clearTimeout(hideTimer)
  }, [contactStatus?.type])

  if (loading) {
    return <LandingDetailsSkeleton />
  }
  if (error || !data) {
    return (
      <div className="container py-5 text-danger">
        {error || (locale === 'ar' ? 'غير موجود' : 'Not found')}
      </div>
    )
  }

  const gallery = data.images.length > 0 ? data.images : ['/landing/img/feature-2.jpg']
  const activeSrc = gallery[Math.min(activeImage, gallery.length - 1)]

  const submitOwnerContact = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    if (!data) return
    if (!isDateRangeValid) {
      setContactStatus({ type: 'warning', message: text.invalidDateRange })
      return
    }

    setContactStatus(null)
    const formData = new FormData(event.currentTarget)
    const payload = {
      propertyId: data.id,
      customerName: String(formData.get('customerName') || ''),
      customerEmail: String(formData.get('customerEmail') || ''),
      customerPhone: String(formData.get('customerPhone') || ''),
      bookingFromDate,
      bookingToDate,
    }

    try {
      setContactSubmitting(true)
      const precheckParams = new URLSearchParams({
        propertyId: data.id,
        bookingFromDate,
        bookingToDate,
      })
      const precheckResponse = await fetch(`/api/landing/bookings/availability?${precheckParams.toString()}`, {
        cache: 'no-store',
      })
      const precheckPayload = await precheckResponse.json().catch(() => null)
      if (!precheckResponse.ok) {
        setContactStatus({
          type: 'error',
          message: precheckPayload?.error || text.availabilityError,
        })
        return
      }
      if (precheckPayload?.available === false) {
        setAvailabilityStatus('unavailable')
        setAvailabilityMessage(text.unavailableRange)
        setContactStatus({
          type: 'warning',
          message: text.unavailableRange,
        })
        return
      }
      setAvailabilityStatus('available')
      setAvailabilityMessage(text.availableRange)

      const response = await fetch('/api/landing/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (response.status === 409) {
        setContactStatus({
          type: 'warning',
          message: result?.error || text.unavailableRange,
        })
        return
      }
      if (!response.ok) throw new Error(result?.error || text.genericError)
      setContactStatus({ type: 'success', message: text.requestSuccess })
      formElement.reset()
    } catch (err: any) {
      setContactStatus({
        type: 'error',
        message: err?.message || text.genericError,
      })
    } finally {
      setContactSubmitting(false)
    }
  }

  return (
    <div className="container-fluid property-details-page py-5">
      {contactStatus?.type === 'success' && (
        <div className="landing-sweet-alert-backdrop" role="dialog" aria-modal="true" aria-live="polite">
          <div className="landing-sweet-alert-card">
            <img
              src="/logo.png"
              alt="Algomhoria Logo"
              className="landing-sweet-alert-logo"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
            <div className="landing-sweet-alert-icon" aria-hidden="true">
              <i className="fas fa-check-circle"></i>
            </div>
            <h5 className="landing-sweet-alert-title">
              {locale === 'ar' ? 'تم إرسال الطلب بنجاح' : 'Contact Request Sent'}
            </h5>
            <p className="landing-sweet-alert-message mb-0">{contactStatus.message}</p>
            <button
              type="button"
              className="landing-sweet-alert-btn"
              onClick={() => setContactStatus(null)}
            >
              {locale === 'ar' ? 'حسنا' : 'OK'}
            </button>
          </div>
        </div>
      )}
      <div className="container py-5">
        <div className="property-hero-card mb-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <h1 className="display-6 mb-2">{data.title}</h1>
              <p className="mb-0 text-muted">
                <i className="fas fa-map-marker-alt me-2 text-primary"></i>
                {data.location}
              </p>
            </div>
            <div className="property-price-badge">
              {Number(data.price || 0).toLocaleString()} EGP
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-8">
            <div className="property-gallery-card">
              <SafeImage src={activeSrc} alt={data.title} />
            </div>

            <div className="row g-2 mt-3">
              {gallery.slice(0, 8).map((img, index) => (
                <div className="col-3" key={`${img}-${index}`}>
                  <button
                    className={`p-0 border-0 w-100 property-thumb-btn ${index === activeImage ? 'active' : ''}`}
                    style={{ background: 'transparent', borderRadius: 12, overflow: 'hidden' }}
                    type="button"
                    onClick={() => setActiveImage(index)}
                  >
                    <img
                      src={img}
                      alt={`${data.title}-${index}`}
                      className="img-fluid rounded"
                      style={{ width: '100%', height: 90, objectFit: 'cover' }}
                      onError={(e) => {
                        ;(e.currentTarget as HTMLImageElement).src = '/landing/img/feature-2.jpg'
                      }}
                    />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 property-panel p-4">
              <h4 className="mb-3">{text.description}</h4>
              <p className="mb-0" style={{ whiteSpace: 'pre-line', lineHeight: 1.9 }}>
                {data.description}
              </p>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="property-panel p-4">
              <div className="spec-row">
                <span>{text.propertyType}</span>
                <strong>{data.property_type || '-'}</strong>
              </div>
              <div className="spec-row">
                <span>{text.section}</span>
                <strong>{data.section || '-'}</strong>
              </div>
              <div className="spec-row">
                <span>{text.view}</span>
                <strong>{data.view_type || '-'}</strong>
              </div>
              <div className="spec-row">
                <span>{text.code}</span>
                <strong>{data.code}</strong>
              </div>

              <div className="row g-2 mt-2">
                <div className="col-6">
                  <div className="mini-spec">
                    <i className="fas fa-bed text-primary"></i>
                    <div><small>{text.beds}</small><strong>{data.beds}</strong></div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="mini-spec">
                    <i className="fas fa-bath text-primary"></i>
                    <div><small>{text.baths}</small><strong>{data.baths}</strong></div>
                  </div>
                </div>
                <div className="col-12">
                  <div className="mini-spec">
                    <i className="fas fa-ruler-combined text-primary"></i>
                    <div><small>{text.size}</small><strong>{data.size} {text.m2}</strong></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 property-panel p-4">
              <h5 className="mb-3">{text.services}</h5>
              <div className="d-flex flex-wrap gap-2">
                {data.services.map((x) => (
                  <span key={x} className="spec-chip">{x}</span>
                ))}
                {data.services.length === 0 && <span className="text-muted">-</span>}
              </div>
            </div>

            <div className="mt-4 property-panel p-4">
              <h5 className="mb-3">{text.facilities}</h5>
              <div className="d-flex flex-wrap gap-2">
                {data.facilities.map((x) => (
                  <span key={x} className="spec-chip">{x}</span>
                ))}
                {data.facilities.length === 0 && <span className="text-muted">-</span>}
              </div>
            </div>

            <div className="mt-4 property-panel p-4">
              <h5 className="mb-3">{text.contactOwner}</h5>
              <form className="row g-2" onSubmit={submitOwnerContact}>
                <div className="col-12">
                  <input
                    className="form-control modern-input"
                    name="customerName"
                    placeholder={text.name}
                    required
                  />
                </div>
                <div className="col-12">
                  <input
                    className="form-control modern-input"
                    type="email"
                    name="customerEmail"
                    placeholder={text.email}
                    required
                  />
                </div>
                <div className="col-12">
                  <DateRangePicker
                    locale={locale}
                    fromDateLabel={text.fromDate}
                    toDateLabel={text.toDate}
                    fromDate={bookingFromDate}
                    toDate={bookingToDate}
                    className="booking-date-range-highlight"
                    onChange={({ fromDate, toDate }) => {
                      setBookingFromDate(fromDate)
                      setBookingToDate(toDate)
                      setContactStatus(null)
                    }}
                  />
                </div>
                {!isDateRangeValid && bookingFromDate && bookingToDate && (
                  <div className="col-12">
                    <div className="landing-contact-status-badge warning">{text.invalidDateRange}</div>
                  </div>
                )}
                <div className="col-12">
                  <input
                    className="form-control modern-input"
                    name="customerPhone"
                    placeholder={text.phone}
                    required
                  />
                </div>
                <div className="col-12 d-grid mt-2">
                  <button
                    className="btn btn-primary rounded-pill py-2"
                    type="submit"
                    disabled={
                      contactSubmitting ||
                      !isDateRangeValid ||
                      availabilityStatus === 'checking' ||
                      availabilityStatus === 'unavailable'
                    }
                  >
                    {contactSubmitting
                      ? text.sending
                      : text.sendRequest}
                  </button>
                </div>
                {availabilityStatus === 'checking' && (
                  <div className="col-12">
                    <small className="text-muted d-block mt-1">{availabilityMessage}</small>
                  </div>
                )}
                {availabilityStatus === 'available' && (
                  <div className="col-12">
                    <div className="landing-contact-status-badge success">{availabilityMessage}</div>
                  </div>
                )}
                {availabilityStatus === 'unavailable' && (
                  <div className="col-12">
                    <div className="landing-contact-status-badge warning">{availabilityMessage}</div>
                  </div>
                )}
                {availabilityStatus === 'error' && (
                  <div className="col-12">
                    <div className="landing-contact-status-badge error">{availabilityMessage}</div>
                  </div>
                )}
                {!isDateRangeValid && (
                  <div className="col-12">
                    <small className="text-muted d-block mt-1">{text.helperInvalidDates}</small>
                  </div>
                )}
                {contactStatus && contactStatus.type !== 'success' && (
                  <div className="col-12">
                    <div className={`landing-premium-alert ${contactStatus.type}`} role="status" aria-live="polite">
                      <div className="landing-premium-alert-icon" aria-hidden="true">
                        {contactStatus.type === 'warning' ? (
                          <i className="fas fa-exclamation-triangle"></i>
                        ) : (
                          <i className="fas fa-times-circle"></i>
                        )}
                      </div>
                      <div className="landing-premium-alert-content">
                        <strong className="landing-premium-alert-title">
                          {contactStatus.type === 'warning'
                            ? locale === 'ar'
                              ? 'تنبيه'
                              : 'Notice'
                            : locale === 'ar'
                              ? 'خطأ'
                              : 'Error'}
                        </strong>
                        <p className="landing-premium-alert-message mb-0">{contactStatus.message}</p>
                      </div>
                      <button
                        type="button"
                        className="landing-premium-alert-close"
                        onClick={() => setContactStatus(null)}
                        aria-label={locale === 'ar' ? 'إغلاق' : 'Dismiss'}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
