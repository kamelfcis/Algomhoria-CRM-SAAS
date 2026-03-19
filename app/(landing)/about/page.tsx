'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function AboutPage() {
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
            {isArabic ? 'من نحن' : 'About Us'}
          </h4>
          <ol className="breadcrumb d-flex justify-content-center mb-0 wow fadeInDown" data-wow-delay="0.3s">
            <li className="breadcrumb-item">
              <Link href="/">{isArabic ? 'الرئيسية' : 'Home'}</Link>
            </li>
            <li className="breadcrumb-item">
              <Link href="#">{isArabic ? 'الصفحات' : 'Pages'}</Link>
            </li>
            <li className="breadcrumb-item active text-primary">{isArabic ? 'من نحن' : 'About'}</li>
          </ol>
        </div>
      </div>
      {/* Header End */}

      {/* About Start */}
      <div className="container-fluid about py-5">
        <div className="container py-5">
          <div className="row g-5">
            <div className="col-xl-6 wow fadeInUp" data-wow-delay="0.2s">
              <div>
                <h4 className="text-primary">{isArabic ? 'عن الجمهورية' : 'About Algomhoria'}</h4>
                <h1 className="display-5 mb-4">
                  {isArabic ? 'شريكك العقاري الموثوق' : 'Your Trusted Real Estate Partner'}
                </h1>
                <p className="mb-5">
                  {isArabic
                    ? 'توفر الجمهورية خدمات البحث وعرض الشقق والفيلات والمحلات وغيرها مجانا، سواء كنت تبحث عن عقار للايجار او التمليك او كنت مالكا تريد الوصول للمشتري المناسب.'
                    : 'Algomhoria offers all services for searching and viewing apartments, villas, shops and more for free. If you are looking for an apartment for rent or ownership, or if you are an owner and want to offer it to reach the right buyer.'}
                </p>
                <div className="row g-4">
                  <div className="col-md-6">
                    <div className="d-flex">
                      <div className="me-3">
                        <i className="fas fa-home fa-3x text-primary"></i>
                      </div>
                      <div>
                        <h4>{isArabic ? 'تنوع واسع' : 'Wide Selection'}</h4>
                        <p>{isArabic ? 'الاف العقارات في جميع انحاء مصر' : 'Thousands of properties across Egypt'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="d-flex">
                      <div className="me-3">
                        <i className="fas fa-search fa-3x text-primary"></i>
                      </div>
                      <div>
                        <h4>{isArabic ? 'بحث سهل' : 'Easy Search'}</h4>
                        <p>{isArabic ? 'اعثر على العقار بسرعة وسهولة' : 'Find properties quickly and easily'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="d-flex">
                      <div className="me-3">
                        <i className="fas fa-hand-holding-usd fa-3x text-primary"></i>
                      </div>
                      <div>
                        <h4>{isArabic ? 'خدمة مجانية' : 'Free Service'}</h4>
                        <p>{isArabic ? 'بدون رسوم على نشر العقارات' : 'No fees for property listings'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="d-flex">
                      <div className="me-3">
                        <i className="fas fa-shield-alt fa-3x text-primary"></i>
                      </div>
                      <div>
                        <h4>{isArabic ? 'منصة موثوقة' : 'Trusted Platform'}</h4>
                        <p>{isArabic ? 'عقارات وملاك موثقون' : 'Verified properties and owners'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-6 wow fadeInUp" data-wow-delay="0.4s">
              <div className="position-relative rounded">
                <div className="rounded" style={{ marginTop: '40px' }}>
                  <div className="row g-0">
                    <div className="col-lg-12">
                      <div className="rounded mb-4">
                        <Image
                          src="/logo.png"
                          className="img-fluid rounded w-100"
                          alt="About Algomhoria"
                          width={600}
                          height={400}
                          style={{ objectFit: 'contain', background: '#fff', padding: '24px' }}
                        />
                      </div>
                      <div className="row gx-4 gy-0">
                        <div className="col-6">
                          <div className="counter-item bg-primary rounded text-center p-4 h-100">
                            <div className="counter-item-icon mx-auto mb-3">
                              <i className="fas fa-thumbs-up fa-3x text-white"></i>
                            </div>
                            <div className="counter-counting mb-3">
                              <span
                                className="text-white fs-2 fw-bold"
                                data-toggle="counter-up"
                              >
                                23
                              </span>
                              <span className="h1 fw-bold text-white">K +</span>
                            </div>
                            <h5 className="text-white mb-0">{isArabic ? 'العقارات' : 'Properties'}</h5>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="counter-item bg-dark rounded text-center p-4 h-100">
                            <div className="counter-item-icon mx-auto mb-3">
                              <i className="fas fa-certificate fa-3x text-white"></i>
                            </div>
                            <div className="counter-counting mb-3">
                              <span
                                className="text-white fs-2 fw-bold"
                                data-toggle="counter-up"
                              >
                                150
                              </span>
                              <span className="h1 fw-bold text-white"> +</span>
                            </div>
                            <h5 className="text-white mb-0">{isArabic ? 'عملاء سعداء' : 'Happy Clients'}</h5>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className="rounded bg-primary p-4 position-absolute d-flex justify-content-center"
                  style={{
                    width: '90%',
                    height: '80px',
                    top: '-40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                >
                  <h3 className="mb-0 text-white">
                    {isArabic ? 'منصة عقارية موثوقة' : 'Trusted Real Estate Platform'}
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* About End */}
    </>
  )
}

