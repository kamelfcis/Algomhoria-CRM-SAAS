'use client'

import { useEffect, useMemo, useState } from 'react'
import { ProjectCard } from '@/components/landing/ProjectCard'
import { PropertyCard } from '@/components/landing/PropertyCard'
import { LandingGridSkeleton } from '@/components/landing/LandingSkeletons'
import { HeroSearchTabs } from '@/components/landing/HeroSearchTabs'

interface LandingData {
  sliders: Array<{
    id: string
    title: string
    description: string
    image_url: string
    link_url: string | null
  }>
  projects: Array<{
    id: string
    title: string
    description: string
    image_url: string | null
    category: string
    location: string
    project_type: string
    facilities_count: number
    services_count: number
    units_count: number
  }>
  properties: Array<{
    id: string
    code: string
    title: string
    location: string
    price: number | null
    sale_price: number | null
    rent_price: number | null
    section: string
    image_url: string | null
    images: string[]
    property_type: string
    beds: number
    baths: number
    parking: number
    area: number
    is_featured: boolean
  }>
  posts: Array<{
    id: string
    title: string
    category: string
    image_url: string | null
    published_at: string | null
  }>
  settings: Record<string, string | null>
}

const LANDING_HOME_CACHE_KEY = 'landing-home-cache-v1'
const PARTNER_LOGOS = [
  'https://themesflat.co/html/dreamhomehtml/assets/images/img-box/brand-1.png',
  'https://themesflat.co/html/dreamhomehtml/assets/images/img-box/brand-2.png',
  'https://themesflat.co/html/dreamhomehtml/assets/images/img-box/brand-3.png',
  'https://themesflat.co/html/dreamhomehtml/assets/images/img-box/brand-4.png',
  'https://themesflat.co/html/dreamhomehtml/assets/images/img-box/brand-5.png',
]

function SafeImage({
  src,
  fallbackSrc,
  alt,
  className,
  width,
  height,
  style,
  loading = 'lazy',
  fetchPriority,
}: {
  src: string
  fallbackSrc: string
  alt: string
  className?: string
  width?: number
  height?: number
  style?: React.CSSProperties
  loading?: 'lazy' | 'eager'
  fetchPriority?: 'high' | 'low' | 'auto'
}) {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc)

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc)
  }, [src, fallbackSrc])

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      style={style}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc)
        }
      }}
    />
  )
}

function getLocaleFromCookie(): 'ar' | 'en' {
  if (typeof document === 'undefined') return 'en'
  const raw = document.cookie
    .split('; ')
    .find((row) => row.startsWith('locale='))
    ?.split('=')[1]
  return raw === 'ar' ? 'ar' : 'en'
}

function getDictionary(locale: 'ar' | 'en') {
  if (locale === 'ar') {
    return {
      homeTitle: 'الجمهورية العقارية',
      browseProjects: 'تصفح المشاريع',
      featuredProjects: 'مشاريع مميزة',
      featuredProperties: 'عقارات مميزة',
      recentProperties: 'احدث العقارات',
      latestArticles: 'احدث المقالات',
      trustedCompanies: 'موثوق بنا من اكثر من 150+ شركة كبرى',
      loading: 'جاري التحميل...',
      noData: 'لا توجد بيانات حاليا',
    }
  }
  return {
    homeTitle: 'Algomhoria Real Estate',
    browseProjects: 'Browse Projects',
    featuredProjects: 'Featured Projects',
    featuredProperties: 'Featured Properties',
    recentProperties: 'Recent Properties',
    latestArticles: 'Latest Articles',
    trustedCompanies: 'Trusted by over 150+ major companies',
    loading: 'Loading...',
    noData: 'No data found',
  }
}

export default function HomePage() {
  const [locale, setLocale] = useState<'ar' | 'en'>('en')
  const [data, setData] = useState<LandingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const text = useMemo(() => getDictionary(locale), [locale])

  useEffect(() => {
    const activeLocale = getLocaleFromCookie()
    setLocale(activeLocale)

    const controller = new AbortController()
    let hasCachedData = false

    try {
      const cached = window.localStorage.getItem(LANDING_HOME_CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached) as LandingData
        setData(parsed)
        setIsLoading(false)
        hasCachedData = true
      }
    } catch {
      // Ignore cache parsing issues and continue network fetch.
    }

    const load = async () => {
      try {
        if (!hasCachedData) {
          setIsLoading(true)
        }
        setError(null)
        let loaded = false
        let lastError: Error | null = null

        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            const response = await fetch(`/api/landing/home?locale=${activeLocale}`, {
              cache: 'default',
              signal: controller.signal,
            })
            const payload = await response.json()
            if (!response.ok) {
              throw new Error(payload?.error || 'Failed to fetch data')
            }
            setData(payload.data)
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(LANDING_HOME_CACHE_KEY, JSON.stringify(payload.data))
            }
            loaded = true
            break
          } catch (attemptError: any) {
            if (attemptError?.name === 'AbortError') throw attemptError
            lastError = attemptError instanceof Error ? attemptError : new Error('Failed to fetch data')
            if (attempt === 0) {
              await new Promise((resolve) => window.setTimeout(resolve, 350))
            }
          }
        }

        if (!loaded) {
          throw lastError || new Error('Failed to fetch data')
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        setError(err.message || 'Failed to fetch data')
      } finally {
        if (!hasCachedData) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => controller.abort()
  }, [])

  const sliders = data?.sliders || []
  const projects = data?.projects || []
  const properties = data?.properties || []
  const featuredProperties = properties.filter((property) => property.is_featured).slice(0, 6)
  const recentProperties = properties
    .filter((property) => !property.is_featured)
    .slice(0, 6)
  const posts = data?.posts || []
  const truncate = (value: string, max = 220) =>
    value.length > max ? `${value.slice(0, max).trim()}...` : value
  const cardImageStyle: React.CSSProperties = {
    height: '240px',
    width: '100%',
    objectFit: 'cover',
    display: 'block',
  }
  const cardBodyStyle: React.CSSProperties = {
    minHeight: '220px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  }
  const titleClampStyle: React.CSSProperties = {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    minHeight: '48px',
  }
  const textClampStyle: React.CSSProperties = {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    minHeight: '42px',
  }

  const effectiveSlides = sliders

  useEffect(() => {
    setCurrentSlide(0)
  }, [effectiveSlides.length])

  const activeSlide = effectiveSlides[currentSlide] || null
  const showHeroSkeleton = isLoading && effectiveSlides.length === 0

  return (
    <>
      <div className="header-carousel-react position-relative wow fadeIn" data-wow-delay="0.1s">
        <div className="hero-slider-logo-floating">
          <img src="/logo.png" alt="Algomhoria Logo" className="hero-slider-logo" />
        </div>
        <div className="header-carousel-item">
            {!showHeroSkeleton && activeSlide ? (
              <SafeImage
                src={activeSlide.image_url}
                className="img-fluid w-100"
                alt={activeSlide.title || text.homeTitle}
                width={1920}
                height={1080}
                fallbackSrc="/landing/img/feature-1.jpg"
                loading="eager"
                fetchPriority="high"
              />
            ) : (
              <div className="hero-slider-loading-surface"></div>
            )}
            <div className="carousel-caption"></div>
        </div>
        {effectiveSlides.length > 1 && (
          <>
            <button
              type="button"
              className="btn position-absolute hero-slider-nav-btn hero-slider-nav-btn-prev"
              onClick={() => {
                setCurrentSlide((prev) => (prev - 1 + effectiveSlides.length) % effectiveSlides.length)
              }}
              aria-label="Previous slide"
            >
              <i className="bi bi-arrow-left"></i>
            </button>
            <button
              type="button"
              className="btn position-absolute hero-slider-nav-btn hero-slider-nav-btn-next"
              onClick={() => {
                setCurrentSlide((prev) => (prev + 1) % effectiveSlides.length)
              }}
              aria-label="Next slide"
            >
              <i className="bi bi-arrow-right"></i>
            </button>
          </>
        )}
      </div>

      <div className="container hero-search-standalone">
        <div className="row g-4 justify-content-center">
          <div className="col-xl-8 col-lg-10">
            <HeroSearchTabs locale={locale} />
          </div>
        </div>
      </div>

      <div className="container-fluid py-5">
        <div className="container py-5">
          <div className="text-center mx-auto pb-4 wow fadeInUp" data-wow-delay="0.1s" style={{ maxWidth: '800px' }}>
            <h2 className="display-6 mb-3">{text.featuredProjects}</h2>
          </div>
          {error && <p className="text-danger">{error}</p>}
          {!isLoading && projects.length === 0 && <p>{text.noData}</p>}
          {isLoading ? (
            <LandingGridSkeleton cards={6} />
          ) : (
            <div className="row g-4">
              {projects.map((project) => (
                <div className="col-md-6 col-lg-4 wow fadeInUp" data-wow-delay="0.2s" key={project.id}>
                  <ProjectCard project={project} locale={locale} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container-fluid blog py-5">
        <div className="container py-5">
          <div className="text-center mx-auto pb-4 wow fadeInUp" data-wow-delay="0.1s" style={{ maxWidth: '800px' }}>
            <h2 className="display-6 mb-3">{text.featuredProperties}</h2>
          </div>
          {isLoading ? (
            <LandingGridSkeleton cards={6} />
          ) : (
            <div className="row g-4">
              {featuredProperties.map((property) => (
                <div className="col-md-6 col-lg-4 wow fadeInUp" data-wow-delay="0.2s" key={property.id}>
                  <PropertyCard property={property} />
                </div>
              ))}
              {featuredProperties.length === 0 && !isLoading && (
                <p className="mb-0 text-center">{text.noData}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="container-fluid blog py-5">
        <div className="container py-5">
          <div className="text-center mx-auto pb-4 wow fadeInUp" data-wow-delay="0.1s" style={{ maxWidth: '800px' }}>
            <h2 className="display-6 mb-3">{text.recentProperties}</h2>
          </div>
          {isLoading ? (
            <LandingGridSkeleton cards={6} />
          ) : (
            <div className="row g-4">
              {recentProperties.map((property) => (
                <div className="col-md-6 col-lg-4 wow fadeInUp" data-wow-delay="0.2s" key={property.id}>
                  <PropertyCard property={property} />
                </div>
              ))}
              {recentProperties.length === 0 && !isLoading && (
                <p className="mb-0 text-center">{text.noData}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="container-fluid py-5">
        <div className="container py-5">
          <div className="partners-title text-center wow fadeInUp" data-wow-delay="0.1s">
            <h4>{text.trustedCompanies}</h4>
          </div>
          <div className="partners-marquee wow fadeInUp" data-wow-delay="0.2s">
            <div className="partners-marquee-track">
              {[...PARTNER_LOGOS, ...PARTNER_LOGOS].map((logo, index) => (
                <div className="partner-item" key={`${logo}-${index}`}>
                  <img src={logo} alt={`partner-${index + 1}`} height={70} loading="lazy" decoding="async" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid blog py-5">
        <div className="container py-5">
          <div className="text-center mx-auto pb-5 wow fadeInUp" data-wow-delay="0.1s" style={{ maxWidth: '800px' }}>
            <h2 className="display-6 mb-3">{text.latestArticles}</h2>
          </div>
          {isLoading ? (
            <LandingGridSkeleton cards={3} />
          ) : (
            <div className="row g-4">
              {posts.map((post) => (
                <div className="col-lg-4 wow fadeInUp" data-wow-delay="0.2s" key={post.id}>
                  <div className="blog-item h-100">
                    <div className="blog-img">
                      <SafeImage
                        src={post.image_url || '/landing/img/blog-1.jpg'}
                        className="img-fluid w-100 rounded-top"
                        alt={post.title}
                        width={400}
                        height={250}
                        fallbackSrc="/landing/img/blog-1.jpg"
                        style={cardImageStyle}
                        loading="lazy"
                        fetchPriority="low"
                      />
                      <div className="blog-category py-2 px-4">{post.category}</div>
                    </div>
                    <div className="blog-content p-4" style={cardBodyStyle}>
                      <h5 className="mb-2" style={titleClampStyle}>{post.title}</h5>
                      {post.published_at && (
                        <p className="text-muted mb-0">
                          {new Date(post.published_at).toLocaleDateString(locale)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

