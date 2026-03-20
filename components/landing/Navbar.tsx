'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface LandingSocialLinks {
  facebook_url?: string | null
  twitter_url?: string | null
  instagram_url?: string | null
  linkedin_url?: string | null
}

interface LandingSectionLink {
  id: string
  name: string
}

function getLocaleFromCookie(): 'ar' | 'en' {
  if (typeof document === 'undefined') return 'en'
  const raw = document.cookie
    .split('; ')
    .find((row) => row.startsWith('locale='))
    ?.split('=')[1]
  return raw === 'ar' ? 'ar' : 'en'
}

export function Navbar({
  socialLinks,
  propertySections,
}: {
  socialLinks?: LandingSocialLinks | null
  propertySections?: LandingSectionLink[] | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true)
  const [viewportWidth, setViewportWidth] = useState(1440)
  const [locale, setLocale] = useState<'ar' | 'en'>('en')
  const [adCode, setAdCode] = useState('')
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [dynamicPropertySections, setDynamicPropertySections] = useState<LandingSectionLink[]>(
    propertySections || []
  )
  const [currentUser, setCurrentUser] = useState<{
    id: string
    email: string
    name: string
    author_image_url?: string | null
  } | null>(null)
  const propertyCloseTimerRef = useRef<number | null>(null)
  const pagesCloseTimerRef = useRef<number | null>(null)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)
  const accountTriggerRef = useRef<HTMLButtonElement | null>(null)
  const accountItemRefs = useRef<Array<HTMLAnchorElement | HTMLButtonElement | null>>([])

  useEffect(() => {
    // Check if desktop on mount and resize
    const checkDesktop = () => {
      setViewportWidth(window.innerWidth)
      const desktop = window.innerWidth >= 992
      setIsDesktop(desktop)
      // Auto-close mobile menu when switching to desktop
      if (desktop) {
        setIsMobileMenuOpen(false)
      }
    }
    
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  useEffect(() => {
    if (isDesktop) return
    const previousOverflow = document.body.style.overflow
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = previousOverflow || ''
    }
    return () => {
      document.body.style.overflow = previousOverflow || ''
    }
  }, [isDesktop, isMobileMenuOpen])

  useEffect(() => {
    if (!isMobileMenuOpen) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isMobileMenuOpen])

  useEffect(() => {
    setLocale(getLocaleFromCookie())
  }, [])

  useEffect(() => {
    if (Array.isArray(propertySections) && propertySections.length > 0) {
      setDynamicPropertySections(propertySections)
    }
  }, [propertySections])

  useEffect(() => {
    let cancelled = false
    const loadSections = async () => {
      try {
        const response = await fetch(`/api/landing/sections?locale=${locale}`, { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok || cancelled) return
        const rows = Array.isArray(payload?.data)
          ? payload.data
              .map((item: any) => ({
                id: String(item?.id || ''),
                name: String(item?.name || ''),
              }))
              .filter((item: LandingSectionLink) => item.id && item.name)
          : []
        if (!cancelled) {
          setDynamicPropertySections(rows)
        }
      } catch {
        // Keep fallback links if request fails.
      }
    }
    loadSections()
    return () => {
      cancelled = true
    }
  }, [locale])

  useEffect(() => {
    return () => {
      if (propertyCloseTimerRef.current) {
        window.clearTimeout(propertyCloseTimerRef.current)
      }
      if (pagesCloseTimerRef.current) {
        window.clearTimeout(pagesCloseTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    const loadCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || cancelled) {
        setCurrentUser(null)
        return
      }

      const profileResponse = await fetch('/api/landing/auth/profile', { cache: 'no-store' })
      const profilePayload = await profileResponse.json().catch(() => null)
      const profile = profileResponse.ok ? profilePayload?.data : null

      if (cancelled) return
      setCurrentUser({
        id: user.id,
        email: String(profile?.email || user.email || ''),
        name: String(profile?.name || user.user_metadata?.name || user.email || 'User'),
        author_image_url: profile?.author_image_url || null,
      })
    }

    loadCurrentUser()
    const { data: authSub } = supabase.auth.onAuthStateChange(() => {
      loadCurrentUser()
    })

    return () => {
      cancelled = true
      authSub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!accountMenuRef.current) return
      if (!accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    if (!accountMenuOpen) return
    const firstItem = accountItemRefs.current[0]
    if (firstItem) {
      window.setTimeout(() => firstItem.focus(), 0)
    }
  }, [accountMenuOpen])

  const isActive = (path: string) => pathname === path
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false)
  const isPropertiesRoute = pathname.startsWith('/properties')
  const isPropertiesTriggerActive = isPropertiesRoute || propertyDropdownOpen
  const isPagesRoute =
    pathname.startsWith('/blog') ||
    pathname.startsWith('/feature') ||
    pathname.startsWith('/team')
  const isPagesTriggerActive = isPagesRoute || dropdownOpen
  const isArabic = locale === 'ar'
  const navDirection: 'rtl' | 'ltr' = isArabic ? 'rtl' : 'ltr'

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dir = navDirection
    document.documentElement.lang = locale
    document.body.classList.toggle('landing-rtl', isArabic)
  }, [isArabic, locale, navDirection])

  const labels = isArabic
    ? {
        home: 'الرئيسية',
        about: 'من نحن',
        projects: 'المشاريع',
        service: 'الخدمات',
        properties: 'العقارات',
        bookings: 'الحجوزات',
        addPropertyFree: 'أضف عقارك مجانا',
        login: 'دخول',
        register: 'تسجيل',
        pages: 'الصفحات',
        blog: 'المدونة',
        feature: 'المزايا',
        featuredAreas: 'المناطق المميزة',
        team: 'فريق العمل',
        contact: 'تواصل معنا',
        forSale: 'للبيع',
        forRent: 'للايجار',
        forSaleOrRent: 'للبيع او الايجار',
        allProperties: 'كل العقارات',
        adSearchPlaceholder: 'ابحث برقم الإعلان',
        adSearchButton: 'بحث',
        profile: 'الملف الشخصي',
        myProperties: 'عقاراتي',
        myBookings: 'حجوزاتي',
        logout: 'تسجيل خروج',
        localeToggle: 'English',
      }
    : {
        home: 'Home',
        about: 'About',
        projects: 'Projects',
        service: 'Service',
        properties: 'Properties',
        bookings: 'Bookings',
        addPropertyFree: 'Add Property Free',
        login: 'Login',
        register: 'Register',
        pages: 'Pages',
        blog: 'Our Blog',
        feature: 'Our Feature',
        featuredAreas: 'Featured Areas',
        team: 'Our Team',
        contact: 'Contact',
        forSale: 'For Sale',
        forRent: 'For Rent',
        forSaleOrRent: 'For Sale or Rent',
        allProperties: 'All Properties',
        adSearchPlaceholder: 'Search by advertisement ID',
        adSearchButton: 'Search',
        profile: 'Profile',
        myProperties: 'My Properties',
        myBookings: 'My Bookings',
        logout: 'Logout',
        localeToggle: 'العربية',
      }

  const fallbackPropertyLinks = [
    { href: '/properties/for-sale', label: labels.forSale },
    { href: '/properties/for-rent', label: labels.forRent },
    { href: '/properties/for-sale-or-rent', label: labels.forSaleOrRent },
  ]

  const toggleLocale = () => {
    const nextLocale = locale === 'ar' ? 'en' : 'ar'
    document.cookie = `locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`
    window.location.reload()
  }

  const handleAdSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedCode = adCode.trim()
    if (!normalizedCode) return
    if (!isDesktop) {
      setIsMobileMenuOpen(false)
    }
    router.push(`/listing/${encodeURIComponent(normalizedCode)}`)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setAccountMenuOpen(false)
    setCurrentUser(null)
    router.push('/')
  }

  const focusAccountItem = (nextIndex: number) => {
    const items = accountItemRefs.current.filter(Boolean) as Array<HTMLAnchorElement | HTMLButtonElement>
    if (items.length === 0) return
    const normalizedIndex = ((nextIndex % items.length) + items.length) % items.length
    items[normalizedIndex]?.focus()
  }

  const handleAccountTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setAccountMenuOpen(true)
      window.setTimeout(() => focusAccountItem(0), 0)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setAccountMenuOpen(true)
      window.setTimeout(() => focusAccountItem(-1), 0)
    }
  }

  const handleAccountMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = accountItemRefs.current.filter(Boolean) as Array<HTMLAnchorElement | HTMLButtonElement>
    if (items.length === 0) return
    const activeIndex = items.findIndex((item) => item === document.activeElement)

    if (event.key === 'Escape') {
      event.preventDefault()
      setAccountMenuOpen(false)
      accountTriggerRef.current?.focus()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusAccountItem(activeIndex + 1)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusAccountItem(activeIndex <= 0 ? items.length - 1 : activeIndex - 1)
      return
    }

    if (event.key === 'Tab') {
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
  }

  const socialProfiles = {
    facebook: socialLinks?.facebook_url || 'https://www.facebook.com',
    twitter: socialLinks?.twitter_url || 'https://www.twitter.com',
    instagram: socialLinks?.instagram_url || 'https://www.instagram.com',
    linkedin: socialLinks?.linkedin_url || 'https://www.linkedin.com',
  }
  const isLaptopCompact = isDesktop && viewportWidth < 1360
  const navLinkFontSize = isDesktop ? (isLaptopCompact ? '13px' : '15px') : '14px'
  const navLinkPadding = isDesktop ? (isLaptopCompact ? '20px 8px' : '26px 14px') : '11px 0'

  const clearPropertyCloseTimer = () => {
    if (propertyCloseTimerRef.current) {
      window.clearTimeout(propertyCloseTimerRef.current)
      propertyCloseTimerRef.current = null
    }
  }

  const openPropertyDropdown = () => {
    clearPropertyCloseTimer()
    setPropertyDropdownOpen(true)
  }

  const queuePropertyDropdownClose = () => {
    clearPropertyCloseTimer()
    propertyCloseTimerRef.current = window.setTimeout(() => {
      setPropertyDropdownOpen(false)
    }, 160)
  }

  const clearPagesCloseTimer = () => {
    if (pagesCloseTimerRef.current) {
      window.clearTimeout(pagesCloseTimerRef.current)
      pagesCloseTimerRef.current = null
    }
  }

  const openPagesDropdown = () => {
    clearPagesCloseTimer()
    setDropdownOpen(true)
  }

  const queuePagesDropdownClose = () => {
    clearPagesCloseTimer()
    pagesCloseTimerRef.current = window.setTimeout(() => {
      setDropdownOpen(false)
    }, 160)
  }

  return (
    <>
      <div className="landing-header-top">
        <div className="container-fluid landing-header-top-inner">
          <div className="landing-header-top-left">
            <div className="landing-header-social">
              <a href={socialProfiles.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href={socialProfiles.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <i className="fab fa-instagram"></i>
              </a>
              <a href={socialProfiles.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="https://www.youtube.com/channel/UCSGXpYILDFfz69Jb0x1ywxg/featured" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <i className="fab fa-youtube"></i>
              </a>
              <a href={socialProfiles.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <i className="fab fa-linkedin-in"></i>
              </a>
              <a href="https://api.whatsapp.com/send?phone=201288818000" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                <i className="fab fa-whatsapp"></i>
              </a>
            </div>
            <a className="landing-header-email" href="mailto:info@algomhoria.com">
              info@algomhoria.com
            </a>
          </div>
          <a className="landing-header-phone" href="tel:01288818000">
            <i className="fa fa-phone-alt"></i>
            01288818000
          </a>
        </div>
      </div>

    <div className="container-fluid nav-bar sticky-top px-4 py-2 py-lg-0" dir={navDirection}>
      <nav className="navbar navbar-expand-lg navbar-light" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <Link href="/" className="navbar-brand p-0">
          <div
            className="d-flex align-items-center"
            style={{
              gap: isLaptopCompact ? '8px' : '12px',
              maxWidth: isDesktop ? (isLaptopCompact ? '180px' : '220px') : '180px',
            }}
          >
            <img
              src="/logo.png"
              alt="Algomhoria Logo"
              style={{
                width: isDesktop ? (isLaptopCompact ? '78px' : '102px') : '78px',
                height: isDesktop ? (isLaptopCompact ? '78px' : '102px') : '78px',
                objectFit: 'contain',
                borderRadius: '12px',
              }}
            />
          </div>
        </Link>
        
        {/* Mobile Menu Toggle Button */}
        <button
          className="navbar-toggler d-lg-none"
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle navigation"
          aria-expanded={isMobileMenuOpen}
          aria-controls="navbarCollapse"
          style={{
            border: '1px solid var(--bs-primary, #0d6efd)',
            padding: '8px 15px',
            color: 'var(--bs-primary, #0d6efd)',
            background: 'transparent',
            cursor: 'pointer',
            borderRadius: '4px'
          }}
        >
          <span className="fa fa-bars"></span>
        </button>
        
        {/* Navigation Menu - Always visible on desktop, toggleable on mobile */}
        <div 
          id="navbarCollapse"
          className={`landing-nav-collapse ${!isDesktop ? 'is-mobile-drawer' : ''} ${!isDesktop && isMobileMenuOpen ? 'is-open' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            alignItems: 'stretch',
            justifyContent: 'flex-start',
            width: isDesktop ? 'auto' : '100%',
            gap: isDesktop ? '8px' : '12px',
            marginLeft: isDesktop && !isArabic ? 'auto' : '0',
            marginRight: isDesktop && isArabic ? 'auto' : '0',
            padding: isDesktop ? '2px 0 0' : '20px 0'
          }}
        >
          <div className="landing-nav-main-row">
            {/* Navigation Links */}
            <div 
            className="navbar-nav"
            style={{
              display: 'flex',
              flexDirection: isDesktop ? 'row' : 'column',
              alignItems: isDesktop ? 'center' : isArabic ? 'flex-end' : 'flex-start',
              margin: 0,
              padding: 0,
              listStyle: 'none',
              gap: 0
            }}
          >
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                padding: navLinkPadding,
                color: isActive('/') ? 'var(--bs-primary, #0d6efd)' : 'var(--bs-dark, #212529)',
                textDecoration: 'none',
                fontSize: navLinkFontSize,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'color 0.5s',
                display: 'block'
              }}
              onMouseEnter={(e) => {
                if (!isActive('/')) {
                  e.currentTarget.style.color = 'var(--bs-primary, #0d6efd)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/')) {
                  e.currentTarget.style.color = 'var(--bs-dark, #212529)'
                }
              }}
            >
              {labels.home}
            </Link>
            <Link
              href="/about"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                padding: navLinkPadding,
                color: isActive('/about') ? 'var(--bs-primary, #0d6efd)' : 'var(--bs-dark, #212529)',
                textDecoration: 'none',
                fontSize: navLinkFontSize,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'color 0.5s',
                display: 'block'
              }}
              onMouseEnter={(e) => {
                if (!isActive('/about')) {
                  e.currentTarget.style.color = 'var(--bs-primary, #0d6efd)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/about')) {
                  e.currentTarget.style.color = 'var(--bs-dark, #212529)'
                }
              }}
            >
              {labels.about}
            </Link>
            <Link
              href="/projects/featured-areas"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                padding: navLinkPadding,
                color: pathname.startsWith('/projects')
                  ? 'var(--bs-primary, #0d6efd)'
                  : 'var(--bs-dark, #212529)',
                textDecoration: 'none',
                fontSize: navLinkFontSize,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'color 0.5s',
                display: 'block',
              }}
              onMouseEnter={(e) => {
                if (!pathname.startsWith('/projects')) {
                  e.currentTarget.style.color = 'var(--bs-primary, #0d6efd)'
                }
              }}
              onMouseLeave={(e) => {
                if (!pathname.startsWith('/projects')) {
                  e.currentTarget.style.color = 'var(--bs-dark, #212529)'
                }
              }}
            >
              {labels.projects}
            </Link>
            <Link
              href="/service"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                padding: navLinkPadding,
                color: isActive('/service') ? 'var(--bs-primary, #0d6efd)' : 'var(--bs-dark, #212529)',
                textDecoration: 'none',
                fontSize: navLinkFontSize,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'color 0.5s',
                display: 'block'
              }}
              onMouseEnter={(e) => {
                if (!isActive('/service')) {
                  e.currentTarget.style.color = 'var(--bs-primary, #0d6efd)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/service')) {
                  e.currentTarget.style.color = 'var(--bs-dark, #212529)'
                }
              }}
            >
              {labels.service}
            </Link>
            <div
              className="landing-submenu-wrap"
              onMouseEnter={() => {
                if (isDesktop) openPropertyDropdown()
              }}
              onMouseLeave={() => {
                if (isDesktop) queuePropertyDropdownClose()
              }}
            >
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  clearPropertyCloseTimer()
                  if (!isDesktop) {
                    setPropertyDropdownOpen(!propertyDropdownOpen)
                  }
                }}
                aria-expanded={propertyDropdownOpen}
                style={{
                  padding: isDesktop ? '24px 20px' : '12px 0',
                  color: isPropertiesTriggerActive
                    ? 'var(--bs-primary, #0d6efd)'
                    : 'var(--bs-dark, #212529)',
                  textDecoration: 'none',
                  fontSize: navLinkFontSize,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'color 0.5s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {labels.properties}
                <i
                  className={`fas fa-chevron-down landing-submenu-chevron ${propertyDropdownOpen ? 'open' : ''}`}
                  style={{ fontSize: '12px' }}
                ></i>
              </a>
              {propertyDropdownOpen && (
                <div
                  className="landing-submenu-panel landing-submenu-panel-properties"
                  style={{
                    position: isDesktop ? 'absolute' : 'static',
                    top: 'calc(100% - 2px)',
                    left: isDesktop ? (isArabic ? 'auto' : 0) : 0,
                    right: isDesktop ? (isArabic ? 0 : 'auto') : 0,
                    padding: '10px 0',
                    marginTop: 0,
                    minWidth: '220px',
                    zIndex: 1000,
                    display: 'block',
                  }}
                >
                  <Link
                    href="/properties"
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      setPropertyDropdownOpen(false)
                    }}
                    className="landing-submenu-item"
                  >
                    {labels.allProperties}
                  </Link>
                  {dynamicPropertySections.length > 0
                    ? dynamicPropertySections.map((section) => (
                        <Link
                          key={section.id}
                          href={`/properties/section/${encodeURIComponent(section.id)}`}
                          onClick={() => {
                            setIsMobileMenuOpen(false)
                            setPropertyDropdownOpen(false)
                          }}
                          className="landing-submenu-item"
                        >
                          {section.name}
                        </Link>
                      ))
                    : fallbackPropertyLinks.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            setIsMobileMenuOpen(false)
                            setPropertyDropdownOpen(false)
                          }}
                          className="landing-submenu-item"
                        >
                          {item.label}
                        </Link>
                      ))}
                </div>
              )}
            </div>
            <Link
              href="/bookings"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                padding: navLinkPadding,
                color: pathname.startsWith('/bookings')
                  ? 'var(--bs-primary, #0d6efd)'
                  : 'var(--bs-dark, #212529)',
                textDecoration: 'none',
                fontSize: navLinkFontSize,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'color 0.5s',
                display: 'block',
              }}
              onMouseEnter={(e) => {
                if (!pathname.startsWith('/bookings')) {
                  e.currentTarget.style.color = 'var(--bs-primary, #0d6efd)'
                }
              }}
              onMouseLeave={(e) => {
                if (!pathname.startsWith('/bookings')) {
                  e.currentTarget.style.color = 'var(--bs-dark, #212529)'
                }
              }}
            >
              {labels.bookings}
            </Link>
            <Link
              href="/add-property-free"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                padding: navLinkPadding,
                color: pathname.startsWith('/add-property-free')
                  ? 'var(--bs-primary, #0d6efd)'
                  : 'var(--bs-dark, #212529)',
                textDecoration: 'none',
                fontSize: navLinkFontSize,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'color 0.5s',
                display: 'block',
              }}
              onMouseEnter={(e) => {
                if (!pathname.startsWith('/add-property-free')) {
                  e.currentTarget.style.color = 'var(--bs-primary, #0d6efd)'
                }
              }}
              onMouseLeave={(e) => {
                if (!pathname.startsWith('/add-property-free')) {
                  e.currentTarget.style.color = 'var(--bs-dark, #212529)'
                }
              }}
            >
              {labels.addPropertyFree}
            </Link>
            {currentUser ? (
              <div className="landing-account-wrap" ref={accountMenuRef}>
                <button
                  type="button"
                  className="landing-account-trigger"
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  onKeyDown={handleAccountTriggerKeyDown}
                  ref={accountTriggerRef}
                  aria-haspopup="menu"
                  aria-expanded={accountMenuOpen}
                  aria-controls="landing-account-menu"
                >
                  {currentUser.author_image_url ? (
                    <img src={currentUser.author_image_url} alt={currentUser.name} className="landing-account-avatar" />
                  ) : (
                    <span className="landing-account-avatar landing-account-avatar-fallback">
                      {currentUser.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="landing-account-name">{currentUser.name}</span>
                  <i className={`fas fa-chevron-down landing-submenu-chevron ${accountMenuOpen ? 'open' : ''}`} style={{ fontSize: '12px' }}></i>
                </button>

                {accountMenuOpen && (
                  <div
                    className="landing-account-menu"
                    id="landing-account-menu"
                    role="menu"
                    onKeyDown={handleAccountMenuKeyDown}
                  >
                    <div className="landing-account-menu-header">
                      <strong>{currentUser.name}</strong>
                      <small>{currentUser.email}</small>
                    </div>
                    <Link
                      href="/profile"
                      className="landing-submenu-item"
                      role="menuitem"
                      ref={(element) => {
                        accountItemRefs.current[0] = element
                      }}
                      onClick={() => {
                        setAccountMenuOpen(false)
                        setIsMobileMenuOpen(false)
                      }}
                    >
                      {labels.profile}
                    </Link>
                    <Link
                      href="/add-property-free#my-properties"
                      className="landing-submenu-item"
                      role="menuitem"
                      ref={(element) => {
                        accountItemRefs.current[1] = element
                      }}
                      onClick={() => {
                        setAccountMenuOpen(false)
                        setIsMobileMenuOpen(false)
                      }}
                    >
                      {labels.myProperties}
                    </Link>
                    <Link
                      href="/my-bookings"
                      className="landing-submenu-item"
                      role="menuitem"
                      ref={(element) => {
                        accountItemRefs.current[2] = element
                      }}
                      onClick={() => {
                        setAccountMenuOpen(false)
                        setIsMobileMenuOpen(false)
                      }}
                    >
                      {labels.myBookings}
                    </Link>
                    <button
                      type="button"
                      className="landing-account-logout-btn"
                      onClick={handleLogout}
                      role="menuitem"
                      ref={(element) => {
                        accountItemRefs.current[3] = element
                      }}
                    >
                      {labels.logout}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    padding: navLinkPadding,
                    color: pathname.startsWith('/login')
                      ? 'var(--bs-primary, #0d6efd)'
                      : 'var(--bs-dark, #212529)',
                    textDecoration: 'none',
                    fontSize: navLinkFontSize,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'color 0.5s',
                    display: 'block',
                  }}
                  onMouseEnter={(e) => {
                    if (!pathname.startsWith('/login')) {
                      e.currentTarget.style.color = 'var(--bs-primary, #0d6efd)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!pathname.startsWith('/login')) {
                      e.currentTarget.style.color = 'var(--bs-dark, #212529)'
                    }
                  }}
                >
                  {labels.login}
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    padding: navLinkPadding,
                    color: pathname.startsWith('/register')
                      ? 'var(--bs-primary, #0d6efd)'
                      : 'var(--bs-dark, #212529)',
                    textDecoration: 'none',
                    fontSize: navLinkFontSize,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'color 0.5s',
                    display: 'block',
                  }}
                  onMouseEnter={(e) => {
                    if (!pathname.startsWith('/register')) {
                      e.currentTarget.style.color = 'var(--bs-primary, #0d6efd)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!pathname.startsWith('/register')) {
                      e.currentTarget.style.color = 'var(--bs-dark, #212529)'
                    }
                  }}
                >
                  {labels.register}
                </Link>
              </>
            )}
            <div 
              className="landing-submenu-wrap"
              onMouseEnter={() => {
                if (isDesktop) openPagesDropdown()
              }}
              onMouseLeave={() => {
                if (isDesktop) queuePagesDropdownClose()
              }}
            >
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  clearPagesCloseTimer()
                  if (!isDesktop) {
                    setDropdownOpen(!dropdownOpen)
                  }
                }}
                aria-expanded={dropdownOpen}
                style={{
                  padding: isDesktop ? '24px 20px' : '12px 0',
                  color: isPagesTriggerActive
                    ? 'var(--bs-primary, #0d6efd)'
                    : 'var(--bs-dark, #212529)',
                  textDecoration: 'none',
                  fontSize: navLinkFontSize,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'color 0.5s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {labels.pages}
                <i
                  className={`fas fa-chevron-down landing-submenu-chevron ${dropdownOpen ? 'open' : ''}`}
                  style={{ fontSize: '12px' }}
                ></i>
              </a>
              {dropdownOpen && (
                <div 
                  className="landing-submenu-panel"
                  style={{
                    position: isDesktop ? 'absolute' : 'static',
                    top: 'calc(100% - 2px)',
                    left: isDesktop ? (isArabic ? 'auto' : 0) : 0,
                    right: isDesktop ? (isArabic ? 0 : 'auto') : 0,
                    padding: '10px 0',
                    marginTop: 0,
                    minWidth: '200px',
                    zIndex: 1000,
                    display: 'block'
                  }}
                >
                  <Link 
                    href="/blog" 
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      setDropdownOpen(false)
                    }}
                    className="landing-submenu-item"
                  >
                    {labels.blog}
                  </Link>
                  <Link 
                    href="/feature" 
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      setDropdownOpen(false)
                    }}
                    className="landing-submenu-item"
                  >
                    {labels.feature}
                  </Link>
                  <Link
                    href="/projects/featured-areas"
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      setDropdownOpen(false)
                    }}
                    className="landing-submenu-item"
                  >
                    {labels.featuredAreas}
                  </Link>
                  <Link 
                    href="/team" 
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      setDropdownOpen(false)
                    }}
                    className="landing-submenu-item"
                  >
                    {labels.team}
                  </Link>
                </div>
              )}
            </div>
            <Link
              href="/contact"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                padding: navLinkPadding,
                color: isActive('/contact') ? 'var(--bs-primary, #0d6efd)' : 'var(--bs-dark, #212529)',
                textDecoration: 'none',
                fontSize: navLinkFontSize,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'color 0.5s',
                display: 'block'
              }}
              onMouseEnter={(e) => {
                if (!isActive('/contact')) {
                  e.currentTarget.style.color = 'var(--bs-primary, #0d6efd)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/contact')) {
                  e.currentTarget.style.color = 'var(--bs-dark, #212529)'
                }
              }}
            >
              {labels.contact}
            </Link>
            </div>
          </div>

          <div className="landing-nav-utility-row">
            <form className="landing-ad-search-form" onSubmit={handleAdSearchSubmit}>
              <input
                type="text"
                value={adCode}
                onChange={(event) => setAdCode(event.target.value)}
                placeholder={labels.adSearchPlaceholder}
                className="landing-ad-search-input"
                inputMode="numeric"
                autoComplete="off"
              />
              <button type="submit" className="landing-ad-search-btn" aria-label={labels.adSearchButton}>
                <i className="fas fa-search" aria-hidden="true"></i>
              </button>
            </form>
            <button
              type="button"
              onClick={toggleLocale}
              className="btn btn-primary rounded-pill px-3 py-1"
              style={{
                fontWeight: 600,
                fontSize: '12px',
                lineHeight: 1.8,
                minWidth: '95px',
              }}
            >
              {labels.localeToggle}
            </button>
          </div>
        </div>
      </nav>
    </div>
    {!isDesktop && (
      <button
        type="button"
        aria-label={isArabic ? 'إغلاق القائمة' : 'Close menu'}
        className={`landing-mobile-drawer-overlay ${isMobileMenuOpen ? 'show' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />
    )}
    </>
  )
}
