'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PropertyCard } from '@/components/landing/PropertyCard'
import { LandingGridSkeleton } from '@/components/landing/LandingSkeletons'
import { DateRangePicker } from '@/components/landing/DateRangePicker'

type Locale = 'ar' | 'en'

interface LandingOption {
  id: string
  name: string
  governorate_id?: string | null
}

interface PropertyItem {
  id: string
  code: string
  title: string
  location: string
  price: number
  image_url: string | null
  property_type: string
  beds: number
  baths: number
  parking: number
  area: number
  is_featured: boolean
}

function getLocaleFromCookie(): Locale {
  if (typeof document === 'undefined') return 'en'
  const raw = document.cookie
    .split('; ')
    .find((row) => row.startsWith('locale='))
    ?.split('=')[1]
  return raw === 'ar' ? 'ar' : 'en'
}

export function BookingsPageClient({ forcedLocale }: { forcedLocale?: Locale }) {
  const ITEMS_PER_PAGE = 9
  const searchParams = useSearchParams()
  const [locale] = useState<Locale>(() => forcedLocale || getLocaleFromCookie())

  const [governorates, setGovernorates] = useState<LandingOption[]>([])
  const [areas, setAreas] = useState<LandingOption[]>([])
  const [governorateId, setGovernorateId] = useState('')
  const [areaId, setAreaId] = useState('')
  const [bookingFromDate, setBookingFromDate] = useState('')
  const [bookingToDate, setBookingToDate] = useState('')
  const [sortBy, setSortBy] = useState<'new' | 'old' | 'price_desc' | 'price_asc'>('new')

  const [properties, setProperties] = useState<PropertyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const activeRequest = useRef<AbortController | null>(null)
  const latestLoadRef = useRef(0)
  const hasPageInteractedRef = useRef(false)
  const gridTopRef = useRef<HTMLDivElement | null>(null)

  const text = locale === 'ar'
    ? {
        title: 'الحجوزات',
        subtitle: 'ابحث عن عقارات الإيجار المتاحة حسب التاريخ',
        governorate: 'المحافظة',
        area: 'المنطقة',
        fromDate: 'من تاريخ',
        toDate: 'إلى تاريخ',
        sortBy: 'الترتيب',
        search: 'بحث',
        allGovernorates: 'كل المحافظات',
        allAreas: 'كل المناطق',
        newest: 'الأحدث',
        oldest: 'الأقدم',
        highToLow: 'السعر من الأعلى للأقل',
        lowToHigh: 'السعر من الأقل للأعلى',
        noResults: 'لا توجد عقارات متاحة في هذا النطاق الزمني',
        showing: (from: number, to: number, total: number) => `عرض ${from} - ${to} من ${total}`,
        prev: 'السابق',
        next: 'التالي',
        bookNow: 'احجز الآن',
        invalidDateRange: 'تاريخ النهاية يجب أن يكون بعد أو مساوي لتاريخ البداية',
        chooseDateRange: 'يرجى اختيار تاريخي البداية والنهاية',
      }
    : {
        title: 'Bookings',
        subtitle: 'Find available rental properties by date range',
        governorate: 'Governorate',
        area: 'Area',
        fromDate: 'Date From',
        toDate: 'Date To',
        sortBy: 'Sort By',
        search: 'Search',
        allGovernorates: 'All Governorates',
        allAreas: 'All Areas',
        newest: 'New to Old',
        oldest: 'Old to New',
        highToLow: 'Price (High to Low)',
        lowToHigh: 'Price (Low to High)',
        noResults: 'No available properties found for selected date range',
        showing: (from: number, to: number, total: number) => `Showing ${from} - ${to} of ${total}`,
        prev: 'Prev',
        next: 'Next',
        bookNow: 'Book Now',
        invalidDateRange: 'End date must be greater than or equal to start date',
        chooseDateRange: 'Please select both start and end dates',
      }

  const loadFilters = async (activeLocale: Locale) => {
    const response = await fetch(`/api/landing/filters?locale=${activeLocale}`, { cache: 'no-store' })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload?.error || 'Failed to load filters')
    setGovernorates(payload?.data?.governorates || [])
    setAreas(payload?.data?.areas || [])
  }

  const loadProperties = async (activeLocale: Locale, nextFilters?: {
    governorateId?: string
    areaId?: string
    bookingFromDate?: string
    bookingToDate?: string
  }) => {
    const loadId = latestLoadRef.current + 1
    latestLoadRef.current = loadId
    activeRequest.current?.abort()
    const controller = new AbortController()
    activeRequest.current = controller
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      locale: activeLocale,
      section: 'rent',
    })

    const nextGovernorateId = nextFilters?.governorateId ?? governorateId
    const nextAreaId = nextFilters?.areaId ?? areaId
    const nextBookingFromDate = nextFilters?.bookingFromDate ?? bookingFromDate
    const nextBookingToDate = nextFilters?.bookingToDate ?? bookingToDate

    if (nextGovernorateId) params.set('governorateId', nextGovernorateId)
    if (nextAreaId) params.set('areaId', nextAreaId)
    if (nextBookingFromDate) params.set('bookingFromDate', nextBookingFromDate)
    if (nextBookingToDate) params.set('bookingToDate', nextBookingToDate)

    try {
      const response = await fetch(`/api/landing/properties?${params.toString()}`, {
        cache: 'no-store',
        signal: controller.signal,
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Failed to load properties')
      setProperties(Array.isArray(payload?.data) ? payload.data : [])
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      setError(err?.message || 'Failed to load properties')
      setProperties([])
    } finally {
      if (latestLoadRef.current === loadId) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const nextGovernorateId = searchParams.get('governorateId') || ''
    const nextAreaId = searchParams.get('areaId') || ''
    const nextBookingFromDate = searchParams.get('bookingFromDate') || ''
    const nextBookingToDate = searchParams.get('bookingToDate') || ''
    const nextSort = (searchParams.get('sortBy') as 'new' | 'old' | 'price_desc' | 'price_asc') || 'new'

    setGovernorateId(nextGovernorateId)
    setAreaId(nextAreaId)
    setBookingFromDate(nextBookingFromDate)
    setBookingToDate(nextBookingToDate)
    setSortBy(nextSort)

    const run = async () => {
      try {
        await loadFilters(locale)
        await loadProperties(locale, {
          governorateId: nextGovernorateId,
          areaId: nextAreaId,
          bookingFromDate: nextBookingFromDate,
          bookingToDate: nextBookingToDate,
        })
      } catch (err: any) {
        setError(err?.message || 'Failed to load bookings page')
        setLoading(false)
      }
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, searchParams])

  useEffect(() => {
    return () => activeRequest.current?.abort()
  }, [])

  const filteredAreas = useMemo(() => {
    if (!governorateId) return areas
    return areas.filter((item) => item.governorate_id === governorateId)
  }, [areas, governorateId])

  const sortedProperties = useMemo(() => {
    const items = [...properties]
    if (sortBy === 'old') return items.reverse()
    if (sortBy === 'price_desc') return items.sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
    if (sortBy === 'price_asc') return items.sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
    return items
  }, [properties, sortBy])

  useEffect(() => {
    setCurrentPage(1)
  }, [sortedProperties.length, sortBy, governorateId, areaId, bookingFromDate, bookingToDate])

  const totalPages = Math.max(1, Math.ceil(sortedProperties.length / ITEMS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedProperties = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE
    return sortedProperties.slice(start, start + ITEMS_PER_PAGE)
  }, [sortedProperties, safeCurrentPage])

  const buildPaginationRange = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (safeCurrentPage <= 4) return [1, 2, 3, 4, 5, '...', totalPages] as Array<number | string>
    if (safeCurrentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as Array<number | string>
    }
    return [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages] as Array<number | string>
  }

  useEffect(() => {
    if (!hasPageInteractedRef.current) return
    gridTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [safeCurrentPage])

  const paginationItems = buildPaginationRange()

  const onFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!bookingFromDate || !bookingToDate) {
      setError(text.chooseDateRange)
      return
    }
    if (bookingFromDate > bookingToDate) {
      setError(text.invalidDateRange)
      return
    }
    setError(null)
    setCurrentPage(1)
    loadProperties(locale)
  }

  const buildBookingHref = (code: string) => {
    const params = new URLSearchParams()
    if (bookingFromDate) params.set('bookingFromDate', bookingFromDate)
    if (bookingToDate) params.set('bookingToDate', bookingToDate)
    return `/listing/${code}${params.toString() ? `?${params.toString()}` : ''}`
  }

  return (
    <div className="container-fluid blog py-5">
      <div className="container py-5">
        <div className="text-center mx-auto pb-5 wow fadeInUp" data-wow-delay="0.1s" style={{ maxWidth: 900 }}>
          <h1 className="display-5 mb-3">{text.title}</h1>
          <p className="mb-0 text-muted">{text.subtitle}</p>
        </div>

        <form className="row g-3 mb-5" onSubmit={onFilterSubmit}>
          <div className="col-md-3">
            <select
              className="form-select"
              value={governorateId}
              onChange={(event) => {
                const nextValue = event.target.value
                setGovernorateId(nextValue)
                setAreaId('')
              }}
            >
              <option value="">{text.allGovernorates}</option>
              {governorates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              value={areaId}
              onChange={(event) => setAreaId(event.target.value)}
            >
              <option value="">{text.allAreas}</option>
              {filteredAreas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <DateRangePicker
              locale={locale}
              fromDateLabel={text.fromDate}
              toDateLabel={text.toDate}
              fromDate={bookingFromDate}
              toDate={bookingToDate}
              className="booking-date-range-highlight"
              onChange={({ fromDate, toDate }) => {
                setBookingFromDate(fromDate)
                setBookingToDate(toDate)
                setError(null)
              }}
            />
          </div>
          <div className="col-md-2">
            <select
              className="form-select"
              aria-label={text.sortBy}
              value={sortBy}
              onChange={(event) =>
                setSortBy((event.target.value as 'new' | 'old' | 'price_desc' | 'price_asc') || 'new')
              }
            >
              <option value="new">{text.newest}</option>
              <option value="old">{text.oldest}</option>
              <option value="price_desc">{text.highToLow}</option>
              <option value="price_asc">{text.lowToHigh}</option>
            </select>
          </div>
          <div className="col-md-12 d-flex justify-content-end">
            <button className="btn btn-primary rounded-pill px-4" type="submit">
              {text.search}
            </button>
          </div>
        </form>

        {loading && <LandingGridSkeleton cards={9} />}
        {error && <p className="text-danger">{error}</p>}

        <div ref={gridTopRef} />
        {!loading && !error && paginatedProperties.length === 0 && (
          <p className="text-center text-muted mb-0">{text.noResults}</p>
        )}

        {!loading && paginatedProperties.length > 0 && (
          <div className="row g-4">
            {paginatedProperties.map((property) => (
              <div className="col-lg-4 col-md-6" key={property.id}>
                <PropertyCard property={property} />
                <div className="d-grid mt-2">
                  <Link
                    href={buildBookingHref(property.code)}
                    className="btn btn-outline-primary rounded-pill"
                  >
                    {text.bookNow}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && sortedProperties.length > ITEMS_PER_PAGE && (
          <div className="landing-premium-pagination-wrap mt-5">
            <div className="landing-premium-pagination-info">
              {text.showing(
                (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1,
                Math.min(safeCurrentPage * ITEMS_PER_PAGE, sortedProperties.length),
                sortedProperties.length
              )}
            </div>
            <div className="landing-premium-pagination">
              <button
                type="button"
                className="landing-page-btn"
                disabled={safeCurrentPage === 1}
                onClick={() => {
                  hasPageInteractedRef.current = true
                  setCurrentPage((prev) => Math.max(1, prev - 1))
                }}
              >
                <span className={`landing-page-arrow ${locale === 'ar' ? 'rtl-next' : 'ltr-prev'}`}>
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M12.7 15.3L7.4 10l5.3-5.3 1.4 1.4L10.2 10l3.9 3.9-1.4 1.4z" />
                  </svg>
                </span>
                {text.prev}
              </button>

              {paginationItems.map((item, idx) => {
                if (typeof item === 'string') {
                  return (
                    <span key={`ellipsis-${idx}`} className="landing-page-ellipsis">
                      {item}
                    </span>
                  )
                }
                const isActive = item === safeCurrentPage
                return (
                  <button
                    type="button"
                    key={`page-${item}`}
                    className={`landing-page-number ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      hasPageInteractedRef.current = true
                      setCurrentPage(item)
                    }}
                  >
                    {item}
                  </button>
                )
              })}

              <button
                type="button"
                className="landing-page-btn"
                disabled={safeCurrentPage === totalPages}
                onClick={() => {
                  hasPageInteractedRef.current = true
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }}
              >
                {text.next}
                <span className={`landing-page-arrow ${locale === 'ar' ? 'rtl-prev' : 'ltr-next'}`}>
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M7.3 4.7L12.6 10l-5.3 5.3-1.4-1.4L9.8 10 5.9 6.1l1.4-1.4z" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
