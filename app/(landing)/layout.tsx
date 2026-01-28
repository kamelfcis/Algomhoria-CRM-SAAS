'use client'

import Script from 'next/script'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'
import { LandingStyles } from '@/components/landing/LandingStyles'
import { LandingHead } from './landing-head'
import { useEffect } from 'react'

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Add landing-page class to body to scope styles
    document.body.classList.add('landing-page')
    return () => {
      document.body.classList.remove('landing-page')
    }
  }, [])

  return (
    <div className="landing-page">
      <LandingHead />
      <LandingStyles />

      {/* Spinner */}
      <div
        id="spinner"
        className="show bg-white position-fixed translate-middle w-100 vh-100 top-50 start-50 d-flex align-items-center justify-content-center"
      >
        <div
          className="spinner-border text-primary"
          style={{ width: '3rem', height: '3rem' }}
          role="status"
        >
          <span className="sr-only">Loading...</span>
        </div>
      </div>

      <Navbar />
      {children}
      <Footer />

      {/* JavaScript Libraries - Load in order */}
      <Script
        src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.4/jquery.min.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0/dist/js/bootstrap.bundle.min.js"
        strategy="afterInteractive"
      />
      <Script
        src="/landing/lib/wow/wow.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (typeof window !== 'undefined' && (window as any).WOW) {
            new (window as any).WOW().init()
          }
        }}
      />
      <Script src="/landing/lib/easing/easing.min.js" strategy="afterInteractive" />
      <Script src="/landing/lib/waypoints/waypoints.min.js" strategy="afterInteractive" />
      <Script src="/landing/lib/counterup/counterup.min.js" strategy="afterInteractive" />
      <Script src="/landing/lib/lightbox/js/lightbox.min.js" strategy="afterInteractive" />
      <Script src="/landing/lib/owlcarousel/owl.carousel.min.js" strategy="afterInteractive" />
      <Script
        src="/landing/js/main.js"
        strategy="afterInteractive"
        onLoad={() => {
          // Ensure carousel initializes
          if (typeof window !== 'undefined' && (window as any).jQuery) {
            const $ = (window as any).jQuery
            if ($('.header-carousel').length > 0 && $.fn.owlCarousel) {
              $('.header-carousel').owlCarousel({
                animateOut: 'slideOutDown',
                items: 1,
                autoplay: true,
                smartSpeed: 500,
                dots: false,
                loop: true,
                nav: true,
                navText: [
                  '<i class="bi bi-arrow-left"></i>',
                  '<i class="bi bi-arrow-right"></i>',
                ],
              })
            }
          }
        }}
      />
    </div>
  )
}

