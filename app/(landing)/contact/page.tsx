'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function ContactPage() {
  const [locale, setLocale] = useState<'ar' | 'en'>('en')
  const [name, setName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const nextLocale =
      document.cookie
        .split('; ')
        .find((row) => row.startsWith('locale='))
        ?.split('=')[1] === 'ar'
        ? 'ar'
        : 'en'
    setLocale(nextLocale)
  }, [])

  useEffect(() => {
    if (formStatus?.type !== 'success') return
    const hideTimer = window.setTimeout(() => setFormStatus(null), 3200)
    return () => window.clearTimeout(hideTimer)
  }, [formStatus?.type])
  const isArabic = locale === 'ar'

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setFormStatus(null)
    try {
      const response = await fetch('/api/landing/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone_number: phoneNumber,
          email,
          subject,
          message,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || (isArabic ? 'فشل ارسال الرسالة' : 'Failed to send message'))
      }

      setFormStatus({
        type: 'success',
        text: isArabic ? 'تم ارسال رسالتك بنجاح.' : 'Your message has been sent successfully.',
      })
      setName('')
      setPhoneNumber('')
      setEmail('')
      setSubject('')
      setMessage('')
    } catch (error: any) {
      setFormStatus({
        type: 'error',
        text: error?.message || (isArabic ? 'فشل ارسال الرسالة' : 'Failed to send message'),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {formStatus?.type === 'success' && (
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
              {isArabic ? 'تم إرسال الرسالة بنجاح' : 'Message Sent Successfully'}
            </h5>
            <p className="landing-sweet-alert-message mb-0">{formStatus.text}</p>
            <button
              type="button"
              className="landing-sweet-alert-btn"
              onClick={() => setFormStatus(null)}
            >
              {isArabic ? 'حسنا' : 'OK'}
            </button>
          </div>
        </div>
      )}
      {/* Header Start */}
      <div className="container-fluid bg-breadcrumb">
        <div className="container text-center py-5" style={{ maxWidth: '900px' }}>
          <h4 className="text-white display-4 mb-4 wow fadeInDown" data-wow-delay="0.1s">
            {isArabic ? 'تواصل معنا' : 'Contact Us'}
          </h4>
          <ol className="breadcrumb d-flex justify-content-center mb-0 wow fadeInDown" data-wow-delay="0.3s">
            <li className="breadcrumb-item">
              <Link href="/">{isArabic ? 'الرئيسية' : 'Home'}</Link>
            </li>
            <li className="breadcrumb-item">
              <Link href="#">{isArabic ? 'الصفحات' : 'Pages'}</Link>
            </li>
            <li className="breadcrumb-item active text-primary">{isArabic ? 'تواصل' : 'Contact'}</li>
          </ol>
        </div>
      </div>
      {/* Header End */}

      {/* Contact Start */}
      <div className="container-fluid contact py-5">
        <div className="container py-5">
          <div className="row g-5">
            <div className="col-12 col-xl-6 wow fadeInUp" data-wow-delay="0.2s">
              <div>
                <h4 className="text-primary">{isArabic ? 'تواصل معنا' : 'Get In Touch'}</h4>
                <h1 className="display-5 mb-4">{isArabic ? 'راسلنا لاي استفسار' : 'Contact For Any Query'}</h1>
                <p className="mb-4">
                  {isArabic
                    ? 'لديك اسئلة؟ يسعدنا التواصل معك. ارسل لنا رسالة وسنرد عليك في اسرع وقت.'
                    : "Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible."}
                </p>
                <div className="d-flex align-items-center mb-4">
                  <div className="btn-square bg-primary rounded-circle me-3">
                    <i className="fas fa-map-marker-alt text-white"></i>
                  </div>
                  <div>
                    <h5 className="mb-0">{isArabic ? 'العنوان' : 'Address'}</h5>
                    <p className="mb-0">18 Ahmed Heshmat st., Zamalek, Cairo</p>
                  </div>
                </div>
                <div className="d-flex align-items-center mb-4">
                  <div className="btn-square bg-primary rounded-circle me-3">
                    <i className="fas fa-envelope text-white"></i>
                  </div>
                  <div>
                    <h5 className="mb-0">{isArabic ? 'البريد الالكتروني' : 'Email'}</h5>
                    <p className="mb-0">[email protected]</p>
                  </div>
                </div>
                <div className="d-flex align-items-center">
                  <div className="btn-square bg-primary rounded-circle me-3">
                    <i className="fa fa-phone-alt text-white"></i>
                  </div>
                  <div>
                    <h5 className="mb-0">{isArabic ? 'الهاتف' : 'Phone'}</h5>
                    <p className="mb-0">01288818000</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-xl-6 wow fadeInUp" data-wow-delay="0.4s">
              <div className="contact-form bg-light rounded p-5">
                <h2 className="text-dark mb-4">{isArabic ? 'ارسل رسالة' : 'Send Message'}</h2>
                <form onSubmit={handleSubmit}>
                  <div className="row g-4">
                    <div className="col-12 col-md-6">
                      <input
                        type="text"
                        className="form-control border-0 py-3"
                        placeholder={isArabic ? 'الاسم' : 'Your Name'}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <input
                        type="text"
                        className="form-control border-0 py-3"
                        placeholder={isArabic ? 'رقم الهاتف' : 'Phone Number'}
                        value={phoneNumber}
                        onChange={(event) => setPhoneNumber(event.target.value)}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <input
                        type="email"
                        className="form-control border-0 py-3"
                        placeholder={isArabic ? 'البريد الالكتروني' : 'Your Email'}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </div>
                    <div className="col-12">
                      <input
                        type="text"
                        className="form-control border-0 py-3"
                        placeholder={isArabic ? 'الموضوع' : 'Subject'}
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                      />
                    </div>
                    <div className="col-12">
                      <textarea
                        className="form-control border-0 py-3"
                        rows={5}
                        placeholder={isArabic ? 'الرسالة' : 'Message'}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        required
                      ></textarea>
                    </div>
                    {formStatus && formStatus.type !== 'success' && (
                      <div className="col-12">
                        <div className="landing-premium-alert error" role="status" aria-live="polite">
                          <div className="landing-premium-alert-icon" aria-hidden="true">
                            <i className="fas fa-times-circle"></i>
                          </div>
                          <div className="landing-premium-alert-content">
                            <strong className="landing-premium-alert-title">
                              {isArabic ? 'خطأ' : 'Error'}
                            </strong>
                            <p className="landing-premium-alert-message mb-0">{formStatus.text}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="col-12">
                      <button className="btn btn-primary w-100 py-3" type="submit" disabled={submitting}>
                        {submitting
                          ? (isArabic ? 'جاري الارسال...' : 'Sending...')
                          : (isArabic ? 'ارسال الرسالة' : 'Send Message')}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Contact End */}
    </>
  )
}

