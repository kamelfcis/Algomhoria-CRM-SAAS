'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'

function getLocaleFromCookie(): 'ar' | 'en' {
  if (typeof document === 'undefined') return 'en'
  const raw = document.cookie
    .split('; ')
    .find((row) => row.startsWith('locale='))
    ?.split('=')[1]
  return raw === 'ar' ? 'ar' : 'en'
}

export function Footer() {
  const [locale, setLocale] = useState<'ar' | 'en'>('en')

  useEffect(() => {
    setLocale(getLocaleFromCookie())
  }, [])

  const isArabic = locale === 'ar'
  const t = isArabic
    ? {
        aboutBrand:
          'الجمهورية تقدم خدمات البحث وعرض الشقق والفيلات والمحلات وغيرها مجانا مع تجربة موثوقة للمشتري والمالك.',
        quickLinks: 'روابط سريعة',
        about: 'من نحن',
        feature: 'المزايا',
        services: 'الخدمات',
        properties: 'العقارات',
        blog: 'المدونة',
        contact: 'تواصل معنا',
        support: 'الدعم',
        privacy: 'سياسة الخصوصية',
        terms: 'الشروط والاحكام',
        disclaimer: 'اخلاء المسؤولية',
        faq: 'الاسئلة الشائعة',
        help: 'مساعدة',
        openingHours: 'مواعيد العمل',
        mondayFriday: 'الاثنين - الجمعة',
        saturdaySunday: 'السبت - الاحد',
        paymentAccepted: 'وسائل الدفع',
        allRightsReserved: 'جميع الحقوق محفوظة',
        poweredBy: 'تشغيل بواسطة iLead Integrated Solutions ®',
      }
    : {
        aboutBrand:
          'Algomhoria offers all services for searching and viewing apartments, villas, shops and more for free. If you are looking for an apartment for rent or ownership, or if you are an owner and want to offer it to reach the right buyer.',
        quickLinks: 'Quick Links',
        about: 'About Us',
        feature: 'Feature',
        services: 'Services',
        properties: 'Properties',
        blog: 'Blog',
        contact: 'Contact us',
        support: 'Support',
        privacy: 'Privacy Policy',
        terms: 'Terms & Conditions',
        disclaimer: 'Disclaimer',
        faq: 'FAQ',
        help: 'Help',
        openingHours: 'Opening Hours',
        mondayFriday: 'Monday - Friday',
        saturdaySunday: 'Saturday - Sunday',
        paymentAccepted: 'Payment Accepted',
        allRightsReserved: 'All rights reserved.',
        poweredBy: 'Powered By iLead Integrated Solutions ®',
      }

  return (
    <>
      {/* Footer Start */}
      <div className="container-fluid footer py-5 wow fadeIn" data-wow-delay="0.2s">
        <div className="container py-5">
          <div className="row g-5">
            <div className="col-md-6 col-lg-6 col-xl-4">
              <div className="footer-item">
                <Link href="/" className="p-0">
                  <div className="d-flex align-items-center gap-3 mb-4">
                    <img
                      src="/logo.png"
                      alt="Algomhoria Logo"
                      style={{
                        width: '94px',
                        height: '94px',
                        objectFit: 'contain',
                        borderRadius: '12px',
                      }}
                    />
                    <h4 className="text-white mb-0">
                      {isArabic ? 'الجمهورية العقارية' : 'Algomhoria Real Estate'}
                    </h4>
                  </div>
                </Link>
                <p className="mb-2 text-white">
                  {t.aboutBrand}
                </p>
                <div className="d-flex align-items-center">
                  <i className="fas fa-map-marker-alt text-primary me-3"></i>
                  <p className="text-white mb-0">18 Ahmed Heshmat st., Zamalek, Cairo</p>
                </div>
                <div className="d-flex align-items-center">
                  <i className="fas fa-envelope text-primary me-3"></i>
                  <p className="text-white mb-0">[email protected]</p>
                </div>
                <div className="d-flex align-items-center">
                  <i className="fa fa-phone-alt text-primary me-3"></i>
                  <p className="text-white mb-0">01288818000</p>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-6 col-xl-2">
              <div className="footer-item">
                <h4 className="text-white mb-4">{t.quickLinks}</h4>
                <Link href="/about" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> {t.about}
                </Link>
                <Link href="/feature" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> {t.feature}
                </Link>
                <Link href="/service" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> {t.services}
                </Link>
                <Link href="/properties" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> {t.properties}
                </Link>
                <Link href="/blog" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> {t.blog}
                </Link>
                <Link href="/contact" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> {t.contact}
                </Link>
              </div>
            </div>
            <div className="col-md-6 col-lg-6 col-xl-2">
              <div className="footer-item">
                <h4 className="text-white mb-4">{t.support}</h4>
                <Link href="#" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> {t.privacy}
                </Link>
                <Link href="#" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> {t.terms}
                </Link>
                <Link href="#" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> {t.disclaimer}
                </Link>
                <Link href="#" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> {t.support}
                </Link>
                <Link href="#" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> {t.faq}
                </Link>
                <Link href="#" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> {t.help}
                </Link>
              </div>
            </div>
            <div className="col-md-6 col-lg-6 col-xl-4">
              <div className="footer-item">
                <h4 className="text-white mb-4">{t.openingHours}</h4>
                <div className="opening-date mb-3 pb-3">
                  <div className="opening-clock flex-shrink-0">
                    <h6 className="text-white mb-0 me-auto">{t.mondayFriday}:</h6>
                    <p className="mb-0 text-white">
                      <i className="fas fa-clock text-primary me-2"></i> 9:00 AM - 6:00 PM
                    </p>
                  </div>
                  <div className="opening-clock flex-shrink-0">
                    <h6 className="text-white mb-0 me-auto">{t.saturdaySunday}:</h6>
                    <p className="mb-0 text-white">
                      <i className="fas fa-clock text-primary me-2"></i> 10:00 AM - 4:00 PM
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-white mb-2">{t.paymentAccepted}</p>
                  <Image
                    src="/landing/img/payment.png"
                    alt="Payment Methods"
                    width={200}
                    height={50}
                    className="img-fluid"
                    style={{ width: 'auto', height: 'auto', maxWidth: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Footer End */}

      {/* Copyright Start */}
      <div className="container-fluid copyright py-4">
        <div className="container">
          <div className="row g-4 align-items-center">
            <div className="col-md-6 text-center text-md-start mb-md-0">
              <span className="text-white">
                <Link href="#" className="border-bottom text-white" style={{ textDecoration: 'none' }}>
                  <i className="fas fa-copyright text-white me-2"></i>Algomhoria
                </Link>
                , {t.allRightsReserved}
              </span>
            </div>
            <div className="col-md-6 text-center text-md-end text-white">
              <span>{t.poweredBy}</span>
            </div>
          </div>
        </div>
      </div>
      {/* Copyright End */}

      {/* Back to Top */}
      <a href="#" className="btn btn-primary btn-lg-square rounded-circle back-to-top">
        <i className="fa fa-arrow-up"></i>
      </a>
    </>
  )
}

