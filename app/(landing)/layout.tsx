'use client'

import './landing.css'
import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'
import { LandingStyles } from '@/components/landing/LandingStyles'
import { FloatingContactButtons } from '@/components/landing/FloatingContactButtons'
import { LandingHead } from './landing-head'
import { useEffect, useRef, useState } from 'react'

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [locale, setLocale] = useState<'ar' | 'en'>('en')
  const [showSpinner, setShowSpinner] = useState(true)
  const [socialLinks, setSocialLinks] = useState<{
    facebook_url?: string | null
    twitter_url?: string | null
    instagram_url?: string | null
    linkedin_url?: string | null
  } | null>(null)
  const breadcrumbIntervalRef = useRef<number | null>(null)
  const breadcrumbTransitionRef = useRef<number | null>(null)

  useEffect(() => {
    const localeCookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('locale='))
      ?.split('=')[1]
    const activeLocale = localeCookie === 'ar' ? 'ar' : 'en'
    setLocale(activeLocale)

    // Add landing-page class to body to scope styles
    document.body.classList.add('landing-page')
    document.body.classList.toggle('landing-rtl', activeLocale === 'ar')
    document.documentElement.lang = activeLocale
    document.documentElement.dir = activeLocale === 'ar' ? 'rtl' : 'ltr'

    return () => {
      document.body.classList.remove('landing-page')
      document.body.classList.remove('landing-rtl')
      document.documentElement.dir = 'ltr'
    }
  }, [])

  useEffect(() => {
    setShowSpinner(true)
    let isCancelled = false

    const pageLoadPromise = new Promise<void>((resolve) => {
      if (document.readyState === 'complete') {
        resolve()
        return
      }
      const onLoad = () => resolve()
      window.addEventListener('load', onLoad, { once: true })
    })

    pageLoadPromise.then(() => {
      if (isCancelled) return
      setShowSpinner(false)
      const spinner = document.getElementById('spinner')
      if (spinner) spinner.classList.remove('show')
    })

    return () => {
      isCancelled = true
    }
  }, [pathname])

  useEffect(() => {
    let cancelled = false
    const loadSocialLinks = async () => {
      try {
        const response = await fetch('/api/landing/settings', { cache: 'default' })
        const payload = await response.json()
        if (!response.ok || cancelled) return
        setSocialLinks(payload?.data || null)
      } catch {
        // defaults used in child components
      }
    }
    loadSocialLinks()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement

    const clearTimers = () => {
      if (breadcrumbIntervalRef.current) {
        window.clearInterval(breadcrumbIntervalRef.current)
        breadcrumbIntervalRef.current = null
      }
      if (breadcrumbTransitionRef.current) {
        window.clearTimeout(breadcrumbTransitionRef.current)
        breadcrumbTransitionRef.current = null
      }
    }

    const setImageVar = (name: '--breadcrumb-bg-current' | '--breadcrumb-bg-next', url: string) => {
      const safeUrl = String(url).replace(/"/g, '%22')
      root.style.setProperty(name, `url("${safeUrl}")`)
    }

    let cancelled = false

    const run = async () => {
      try {
        clearTimers()
        const response = await fetch(`/api/landing/projects?locale=${locale}`, { cache: 'default' })
        const payload = await response.json()
        if (!response.ok || cancelled) return

        const rawItems = Array.isArray(payload?.data?.items) ? payload.data.items : []
        const imagePool: string[] = [...new Set<string>(
          rawItems
            .map((item: any) => String(item?.image_url || '').trim())
            .filter((value: string) => value.startsWith('/') || /^https?:\/\//i.test(value))
        )].slice(0, 12)

        if (imagePool.length === 0) {
          root.style.setProperty('--breadcrumb-fade-phase', '0')
          return
        }

        let activeIndex = 0
        setImageVar('--breadcrumb-bg-current', imagePool[activeIndex])
        setImageVar('--breadcrumb-bg-next', imagePool[(activeIndex + 1) % imagePool.length])
        root.style.setProperty('--breadcrumb-fade-phase', '0')

        if (imagePool.length < 2) return

        breadcrumbIntervalRef.current = window.setInterval(() => {
          const nextIndex = (activeIndex + 1) % imagePool.length
          setImageVar('--breadcrumb-bg-next', imagePool[nextIndex])
          root.style.setProperty('--breadcrumb-fade-phase', '1')

          if (breadcrumbTransitionRef.current) {
            window.clearTimeout(breadcrumbTransitionRef.current)
          }
          breadcrumbTransitionRef.current = window.setTimeout(() => {
            setImageVar('--breadcrumb-bg-current', imagePool[nextIndex])
            root.style.setProperty('--breadcrumb-fade-phase', '0')
            activeIndex = nextIndex
          }, 950)
        }, 6000)
      } catch {
        root.style.setProperty('--breadcrumb-fade-phase', '0')
      }
    }

    run()
    return () => {
      cancelled = true
      clearTimers()
    }
  }, [locale])

  return (
    <div className={`landing-page ${locale === 'ar' ? 'rtl' : 'ltr'}`}>
      <LandingHead />
      <LandingStyles />

      {/* Spinner */}
      <div
        id="spinner"
        className={`${showSpinner ? 'show d-flex' : 'd-none'} landing-splash position-fixed translate-middle w-100 vh-100 top-50 start-50 align-items-center justify-content-center`}
      >
        <div className="landing-splash-content" role="status" aria-live="polite">
          <div className="landing-splash-ring"></div>
          <div className="landing-splash-ring ring-delayed"></div>
          <img src="/logo.png" alt="Algomhoria Logo" className="landing-splash-logo" />
          <p className="landing-splash-text">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
       </div>

      <Navbar socialLinks={socialLinks} />
      {children}
      <Footer />
      <FloatingContactButtons socialLinks={socialLinks} />

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
      <Script src="/landing/lib/owlcarousel/owl.carousel.js" strategy="afterInteractive" />
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

