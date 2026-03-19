'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

interface PropertyCardData {
  code: string
  title: string
  location: string
  price: number | null
  sale_price?: number | null
  rent_price?: number | null
  section?: string
  image_url: string | null
  images?: string[]
  property_type: string
  beds: number
  baths: number
  parking: number
  area: number
  is_featured: boolean
}

function SafeImage({
  src,
  fallbackSrc,
  alt,
  loading = 'lazy',
}: {
  src: string
  fallbackSrc: string
  alt: string
  loading?: 'lazy' | 'eager'
}) {
  return (
    <img
      src={src || fallbackSrc}
      alt={alt}
      className="property-card-image"
      loading={loading}
      decoding="async"
      fetchPriority={loading === 'eager' ? 'high' : 'low'}
      onError={(e) => {
        if ((e.currentTarget as HTMLImageElement).src !== fallbackSrc) {
          ;(e.currentTarget as HTMLImageElement).src = fallbackSrc
        }
      }}
    />
  )
}

export function PropertyCard({ property }: { property: PropertyCardData }) {
  const [locale, setLocale] = useState<'ar' | 'en'>('en')
  const [imageIndex, setImageIndex] = useState(0)

  useEffect(() => {
    const raw = document.cookie
      .split('; ')
      .find((row) => row.startsWith('locale='))
      ?.split('=')[1]
    setLocale(raw === 'ar' ? 'ar' : 'en')
  }, [])

  const cardImages = useMemo(() => {
    const images = (property.images || []).filter(Boolean)
    if (images.length > 0) return images
    if (property.image_url) return [property.image_url]
    return ['/landing/img/feature-2.jpg']
  }, [property.images, property.image_url])

  useEffect(() => {
    setImageIndex(0)
  }, [property.code, cardImages.length])

  const isForSale = useMemo(() => {
    const section = String(property.section || '').toLowerCase()
    return (
      section.includes('sale') ||
      section.includes('بيع') ||
      typeof property.sale_price === 'number'
    )
  }, [property.section, property.sale_price])

  const isForRent = useMemo(() => {
    const section = String(property.section || '').toLowerCase()
    return (
      section.includes('rent') ||
      section.includes('إيجار') ||
      section.includes('ايجار') ||
      typeof property.rent_price === 'number'
    )
  }, [property.section, property.rent_price])

  const listingLabel = useMemo(() => {
    if (isForSale && isForRent) return locale === 'ar' ? 'للبيع أو للإيجار' : 'For Sale or Rent'
    if (isForSale) return locale === 'ar' ? 'للبيع' : 'For Sale'
    if (isForRent) return locale === 'ar' ? 'للإيجار' : 'For Rent'
    return null
  }, [isForSale, isForRent, locale])

  const displayPrice = useMemo(() => {
    const candidates = [property.sale_price, property.rent_price, property.price]
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)
    return candidates.length > 0 ? candidates[0] : null
  }, [property.sale_price, property.rent_price, property.price])

  const goToPreviousImage = () => {
    if (cardImages.length <= 1) return
    setImageIndex((prev) => (prev - 1 + cardImages.length) % cardImages.length)
  }

  const goToNextImage = () => {
    if (cardImages.length <= 1) return
    setImageIndex((prev) => (prev + 1) % cardImages.length)
  }

  const maxDots = 6
  const visibleDots = cardImages.slice(0, maxDots)

  return (
    <div className="property-card-premium blog-item wow fadeInUp" data-wow-delay="0.2s">
      <div className="property-card-media position-relative">
        <SafeImage
          src={cardImages[imageIndex] || '/landing/img/feature-2.jpg'}
          fallbackSrc="/landing/img/feature-2.jpg"
          alt={property.title}
          loading="lazy"
        />

        <div className="property-card-topbar position-absolute top-0 start-0 w-100">
          <div className="property-card-type-badge">
            {property.property_type || 'Property'}
          </div>
          {listingLabel && (
            <div className="property-card-listing-badge">
              {listingLabel}
            </div>
          )}
        </div>

        {cardImages.length > 1 && (
          <>
            <button
              type="button"
              className="property-card-nav-btn property-card-nav-prev"
              onClick={goToPreviousImage}
              aria-label={locale === 'ar' ? 'الصورة السابقة' : 'Previous image'}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <button
              type="button"
              className="property-card-nav-btn property-card-nav-next"
              onClick={goToNextImage}
              aria-label={locale === 'ar' ? 'الصورة التالية' : 'Next image'}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
            <div className="property-card-dots position-absolute">
              {visibleDots.map((_, idx) => (
                <button
                  key={`${property.code}-img-dot-${idx}`}
                  type="button"
                  onClick={() => setImageIndex(idx)}
                  aria-label={`${locale === 'ar' ? 'الانتقال للصورة' : 'Go to image'} ${idx + 1}`}
                  className={`property-card-dot ${idx === imageIndex ? 'active' : ''}`}
                />
              ))}
              {cardImages.length > maxDots && (
                <span className="property-card-dots-more">+{cardImages.length - maxDots}</span>
              )}
              <span className="property-card-image-counter">
                {imageIndex + 1}/{cardImages.length}
              </span>
            </div>
          </>
        )}

        <div className="property-card-specs position-absolute">
          <span><i className="fas fa-bed"></i>{property.beds || 0}</span>
          <span><i className="fas fa-bath"></i>{property.baths || 0}</span>
          <span><i className="fas fa-car"></i>{property.parking || 0}</span>
          <span><i className="fas fa-ruler-combined"></i>{property.area || 0}</span>
        </div>
      </div>

      <div className="property-card-content blog-content">
        <div className="property-card-heading-row">
          <h4 className="property-card-title">{property.title}</h4>
          {displayPrice !== null && (
            <h2 className="property-card-price text-primary fw-bold">
              {displayPrice.toLocaleString()} EGP
            </h2>
          )}
        </div>

        {property.is_featured && (
          <div className="property-card-featured-wrap">
            <span className="property-card-featured-badge">
              {locale === 'ar' ? 'مميز' : 'Featured'}
            </span>
          </div>
        )}

        <p className="property-card-location text-primary">
          <i className="fas fa-map-marker-alt me-2"></i>
          {property.location}
        </p>

        <Link href={`/listing/${property.code}`} className="property-card-cta btn btn-primary rounded-pill">
          {locale === 'ar' ? 'عرض التفاصيل' : 'View Details'}
        </Link>
      </div>
    </div>
  )
}
