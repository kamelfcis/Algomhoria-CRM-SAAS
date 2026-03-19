'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function FeaturePage() {
  const [locale, setLocale] = useState<'ar' | 'en'>('en')
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
  const isArabic = locale === 'ar'

  return (
    <>
      {/* Header Start */}
      <div className="container-fluid bg-breadcrumb">
        <div className="container text-center py-5" style={{ maxWidth: '900px' }}>
          <h4 className="text-white display-4 mb-4 wow fadeInDown" data-wow-delay="0.1s">
            {isArabic ? 'مميزاتنا' : 'Our Features'}
          </h4>
          <ol className="breadcrumb d-flex justify-content-center mb-0 wow fadeInDown" data-wow-delay="0.3s">
            <li className="breadcrumb-item">
              <Link href="/">{isArabic ? 'الرئيسية' : 'Home'}</Link>
            </li>
            <li className="breadcrumb-item">
              <Link href="#">{isArabic ? 'الصفحات' : 'Pages'}</Link>
            </li>
            <li className="breadcrumb-item active text-primary">{isArabic ? 'المزايا' : 'Feature'}</li>
          </ol>
        </div>
      </div>
      {/* Header End */}

      {/* Feature Start */}
      <div className="container-fluid feature py-5">
        <div className="container py-5">
          <div className="row g-4">
            <div className="col-lg-4 wow fadeInUp" data-wow-delay="0.2s">
              <div className="feature-item">
                <Image
                  src="/landing/img/feature-1.jpg"
                  className="img-fluid rounded w-100"
                  alt="Best Properties"
                  width={400}
                  height={300}
                />
                <div className="feature-content p-4">
                  <div className="feature-content-inner">
                    <h4 className="text-white">{isArabic ? 'افضل العقارات' : 'Best Properties'}</h4>
                    <p className="text-white">
                      {isArabic
                        ? 'اكتشف افضل العقارات في اميز المواقع داخل مصر من الشقق وحتى الفيلات.'
                        : 'Find the best properties in prime locations across Egypt. From apartments to villas, we have it all.'}
                    </p>
                    <Link
                      href="/properties"
                      className="btn btn-primary rounded-pill py-2 px-4"
                    >
                      {isArabic ? 'اقرأ المزيد' : 'Read More'} <i className="fa fa-arrow-right ms-1"></i>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-4 wow fadeInUp" data-wow-delay="0.4s">
              <div className="feature-item">
                <Image
                  src="/landing/img/feature-2.jpg"
                  className="img-fluid rounded w-100"
                  alt="Easy Search"
                  width={400}
                  height={300}
                />
                <div className="feature-content p-4">
                  <div className="feature-content-inner">
                    <h4 className="text-white">{isArabic ? 'بحث سهل' : 'Easy Search'}</h4>
                    <p className="text-white">
                      {isArabic
                        ? 'ابحث حسب الموقع والسعر والنوع والمزيد للوصول لما تبحث عنه بسرعة.'
                        : "Search by location, price, type, and more. Find exactly what you're looking for in seconds."}
                    </p>
                    <Link
                      href="/properties"
                      className="btn btn-primary rounded-pill py-2 px-4"
                    >
                      {isArabic ? 'اقرأ المزيد' : 'Read More'} <i className="fa fa-arrow-right ms-1"></i>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-4 wow fadeInUp" data-wow-delay="0.6s">
              <div className="feature-item">
                <Image
                  src="/landing/img/feature-3.jpg"
                  className="img-fluid rounded w-100"
                  alt="Trusted Service"
                  width={400}
                  height={300}
                />
                <div className="feature-content p-4">
                  <div className="feature-content-inner">
                    <h4 className="text-white">{isArabic ? 'خدمة موثوقة' : 'Trusted Service'}</h4>
                    <p className="text-white">
                      {isArabic
                        ? 'يثق بنا الاف العملاء مع خدمة احترافية ودعم مستمر طوال رحلتك.'
                        : 'Trusted by thousands of customers. Professional service and support throughout your journey.'}
                    </p>
                    <Link
                      href="/about"
                      className="btn btn-primary rounded-pill py-2 px-4"
                    >
                      {isArabic ? 'اقرأ المزيد' : 'Read More'} <i className="fa fa-arrow-right ms-1"></i>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Feature End */}
    </>
  )
}

