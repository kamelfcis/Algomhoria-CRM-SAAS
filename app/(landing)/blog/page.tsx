'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function BlogPage() {
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
            {isArabic ? 'المدونة' : 'Our Blog'}
          </h4>
          <ol className="breadcrumb d-flex justify-content-center mb-0 wow fadeInDown" data-wow-delay="0.3s">
            <li className="breadcrumb-item">
              <Link href="/">{isArabic ? 'الرئيسية' : 'Home'}</Link>
            </li>
            <li className="breadcrumb-item">
              <Link href="#">{isArabic ? 'الصفحات' : 'Pages'}</Link>
            </li>
            <li className="breadcrumb-item active text-primary">{isArabic ? 'المدونة' : 'Blog'}</li>
          </ol>
        </div>
      </div>
      {/* Header End */}

      {/* Blog Start */}
      <div className="container-fluid blog py-5">
        <div className="container py-5">
          <div
            className="text-center mx-auto pb-5 wow fadeInUp"
            data-wow-delay="0.2s"
            style={{ maxWidth: '800px' }}
          >
            <h4 className="text-primary">{isArabic ? 'مدونة الجمهورية' : 'Our Blog'}</h4>
            <h1 className="display-5 mb-4">{isArabic ? 'احدث الاخبار والمقالات' : 'Latest News & Articles'}</h1>
            <p className="mb-0">
              {isArabic
                ? 'تابع اخر اخبار العقارات والنصائح وتحليلات السوق.'
                : 'Stay updated with the latest real estate news, tips, and market insights.'}
            </p>
          </div>
          <div className="row g-4">
            <div className="col-lg-4 wow fadeInUp" data-wow-delay="0.2s">
              <div className="blog-item">
                <div className="blog-img">
                  <Link href="/blog">
                    <Image
                      src="/landing/img/blog-2.jpg"
                      className="img-fluid w-100 rounded-top"
                      alt="Blog Post"
                      width={400}
                      height={250}
                    />
                  </Link>
                  <div className="blog-category py-2 px-4">{isArabic ? 'عقارات' : 'Real Estate'}</div>
                  <div className="blog-date">
                    <i className="fas fa-clock me-2"></i>January 2025
                  </div>
                </div>
                <div className="blog-content p-4">
                  <Link href="/blog" className="h4 d-inline-block mb-4">
                    {isArabic ? 'نصائح للمشترين لاول مرة' : 'Tips for First-Time Home Buyers'}
                  </Link>
                  <p className="mb-4">
                    {isArabic
                      ? 'نصائح اساسية لمشتري العقار لاول مرة لاتخاذ القرار الصحيح...'
                      : 'Essential tips and advice for first-time home buyers to make the right decision...'}
                  </p>
                  <Link href="/blog" className="btn btn-primary rounded-pill py-2 px-4">
                    {isArabic ? 'اقرأ المزيد' : 'Read More'} <i className="fas fa-arrow-right ms-2"></i>
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-lg-4 wow fadeInUp" data-wow-delay="0.4s">
              <div className="blog-item">
                <div className="blog-img">
                  <Link href="/blog">
                    <Image
                      src="/landing/img/blog-3.jpg"
                      className="img-fluid w-100 rounded-top"
                      alt="Blog Post"
                      width={400}
                      height={250}
                    />
                  </Link>
                  <div className="blog-category py-2 px-4">{isArabic ? 'تحليلات السوق' : 'Market Insights'}</div>
                  <div className="blog-date">
                    <i className="fas fa-clock me-2"></i>January 2025
                  </div>
                </div>
                <div className="blog-content p-4">
                  <Link href="/blog" className="h4 d-inline-block mb-4">
                    {isArabic ? 'اتجاهات سوق العقارات 2025' : 'Real Estate Market Trends 2025'}
                  </Link>
                  <p className="mb-4">
                    {isArabic
                      ? 'تعرف على احدث الاتجاهات والتوقعات لسوق العقارات في 2025...'
                      : 'Explore the latest trends and predictions for the real estate market in 2025...'}
                  </p>
                  <Link href="/blog" className="btn btn-primary rounded-pill py-2 px-4">
                    {isArabic ? 'اقرأ المزيد' : 'Read More'} <i className="fas fa-arrow-right ms-2"></i>
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-lg-4 wow fadeInUp" data-wow-delay="0.6s">
              <div className="blog-item">
                <div className="blog-img">
                  <Link href="/blog">
                    <Image
                      src="/landing/img/blog-1.jpg"
                      className="img-fluid w-100 rounded-top"
                      alt="Blog Post"
                      width={400}
                      height={250}
                    />
                  </Link>
                  <div className="blog-category py-2 px-4">{isArabic ? 'استثمار' : 'Investment'}</div>
                  <div className="blog-date">
                    <i className="fas fa-clock me-2"></i>January 2025
                  </div>
                </div>
                <div className="blog-content p-4">
                  <Link href="/blog" className="h4 d-inline-block mb-4">
                    {isArabic ? 'دليل الاستثمار العقاري' : 'Real Estate Investment Guide'}
                  </Link>
                  <p className="mb-4">
                    {isArabic
                      ? 'دليل شامل للاستثمار العقاري للمبتدئين والمحترفين...'
                      : 'A comprehensive guide to real estate investment for beginners and experts...'}
                  </p>
                  <Link href="/blog" className="btn btn-primary rounded-pill py-2 px-4">
                    {isArabic ? 'اقرأ المزيد' : 'Read More'} <i className="fas fa-arrow-right ms-2"></i>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Blog End */}
    </>
  )
}

