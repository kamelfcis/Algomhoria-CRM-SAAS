'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Locale = 'ar' | 'en'
type HeroTab = 'booking' | 'property'
const FILTERS_CACHE_TTL_MS = 10 * 60 * 1000

interface FilterOption {
  id: string
  name: string
}

interface AreaOption extends FilterOption {
  governorate_id: string | null
}

interface FiltersPayload {
  governorates: FilterOption[]
  areas: AreaOption[]
  propertyTypes: FilterOption[]
  sections: FilterOption[]
}

function getText(locale: Locale) {
  if (locale === 'ar') {
    return {
      subTitle: 'طريقك إلى بيتك المثالي.',
      heading: 'أكثر من عقار... نحن نقدم إمكانيات',
      bookingSearch: 'بحث الحجز',
      propertySearch: 'بحث العقارات',
      city: 'المدينة',
      area: 'المنطقة',
      dateFrom: 'من تاريخ',
      dateTo: 'الى تاريخ',
      choose: 'اختر',
      search: 'بحث',
      section: 'القسم',
      propertyType: 'نوع العقار',
      priceFrom: 'السعر من',
      priceTo: 'السعر الى',
      areaFrom: 'المساحة من',
      areaTo: 'المساحة الى',
      loading: 'جاري التحميل...',
      allSections: 'الكل',
    }
  }

  return {
    subTitle: 'Your Pathway to Home Sweet Home.',
    heading: 'More than Property, We Offer Possibilities',
    bookingSearch: 'Booking Search',
    propertySearch: 'Property Search',
    city: 'City',
    area: 'Area',
    dateFrom: 'Date From',
    dateTo: 'Date To',
    choose: 'Choose',
    search: 'Search',
    section: 'Section',
    propertyType: 'Property Type',
    priceFrom: 'Price From',
    priceTo: 'Price To',
    areaFrom: 'Area From',
    areaTo: 'Area To',
    loading: 'Loading...',
    allSections: 'All',
  }
}

export function HeroSearchTabs({ locale }: { locale: Locale }) {
  const text = useMemo(() => getText(locale), [locale])
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<HeroTab>('booking')
  const [isLoadingFilters, setIsLoadingFilters] = useState(true)
  const [filters, setFilters] = useState<FiltersPayload>({
    governorates: [],
    areas: [],
    propertyTypes: [],
    sections: [],
  })

  const [bookingGovernorateId, setBookingGovernorateId] = useState('')
  const [bookingAreaId, setBookingAreaId] = useState('')
  const [bookingDateFrom, setBookingDateFrom] = useState('')
  const [bookingDateTo, setBookingDateTo] = useState('')

  const [propertySectionId, setPropertySectionId] = useState('')
  const [propertyTypeId, setPropertyTypeId] = useState('')
  const [propertyGovernorateId, setPropertyGovernorateId] = useState('')
  const [propertyAreaId, setPropertyAreaId] = useState('')
  const [priceFrom, setPriceFrom] = useState('')
  const [priceTo, setPriceTo] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const cacheKey = `landing-filters-${locale}`

    const load = async () => {
      try {
        setIsLoadingFilters(true)
        try {
          const raw = window.sessionStorage.getItem(cacheKey)
          if (raw) {
            const parsed = JSON.parse(raw) as { ts: number; data: FiltersPayload }
            if (Date.now() - parsed.ts < FILTERS_CACHE_TTL_MS && parsed?.data) {
              setFilters(parsed.data)
              setIsLoadingFilters(false)
              return
            }
          }
        } catch {
          // Ignore session cache parse issues and continue network fetch.
        }

        const response = await fetch(`/api/landing/filters?locale=${locale}`, {
          cache: 'default',
          signal: controller.signal,
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load filters')
        }
        const nextFilters = payload?.data || {
          governorates: [],
          areas: [],
          propertyTypes: [],
          sections: [],
        }
        setFilters(nextFilters)
        try {
          window.sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: nextFilters }))
        } catch {
          // Ignore cache write failures.
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') return
        setFilters({ governorates: [], areas: [], propertyTypes: [], sections: [] })
      } finally {
        setIsLoadingFilters(false)
      }
    }

    load()
    return () => controller.abort()
  }, [locale])

  const bookingAreas = useMemo(
    () => filters.areas.filter((item) => !bookingGovernorateId || item.governorate_id === bookingGovernorateId),
    [filters.areas, bookingGovernorateId]
  )

  const propertyAreas = useMemo(
    () => filters.areas.filter((item) => !propertyGovernorateId || item.governorate_id === propertyGovernorateId),
    [filters.areas, propertyGovernorateId]
  )

  const handleBookingSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const params = new URLSearchParams()
    params.set('section', 'rent')
    if (bookingGovernorateId) params.set('governorateId', bookingGovernorateId)
    if (bookingAreaId) params.set('areaId', bookingAreaId)
    if (bookingDateFrom) params.set('bookingFromDate', bookingDateFrom)
    if (bookingDateTo) params.set('bookingToDate', bookingDateTo)
    router.push(`/properties?${params.toString()}`)
  }

  const handlePropertySearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const params = new URLSearchParams()
    if (propertySectionId) params.set('sectionId', propertySectionId)
    if (propertyTypeId) params.set('propertyTypeId', propertyTypeId)
    if (propertyGovernorateId) params.set('governorateId', propertyGovernorateId)
    if (propertyAreaId) params.set('areaId', propertyAreaId)
    if (priceFrom) params.set('priceFrom', priceFrom)
    if (priceTo) params.set('priceTo', priceTo)
    router.push(`/properties?${params.toString()}`)
  }

  return (
    <div className="home-tabs">
      <div className="title-slider">
        <span className="sub-title">{text.subTitle}</span>
        <h2>{text.heading}</h2>
      </div>

      <ul className="nav nav-pills home-tabs-nav" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'booking' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('booking')}
          >
            {text.bookingSearch}
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'property' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('property')}
          >
            {text.propertySearch}
          </button>
        </li>
      </ul>

      <div className="tab-content home-tabs-content">
        {activeTab === 'booking' ? (
          <form className="search-frm b-search-form" onSubmit={handleBookingSearch}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">{text.city}</label>
                <select
                  className="form-select"
                  disabled={isLoadingFilters}
                  value={bookingGovernorateId}
                  onChange={(e) => {
                    setBookingGovernorateId(e.target.value)
                    setBookingAreaId('')
                  }}
                >
                  <option value="">{isLoadingFilters ? text.loading : text.choose}</option>
                  {filters.governorates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">{text.area}</label>
                <select
                  className="form-select"
                  disabled={isLoadingFilters}
                  value={bookingAreaId}
                  onChange={(e) => setBookingAreaId(e.target.value)}
                >
                  <option value="">{isLoadingFilters ? text.loading : text.choose}</option>
                  {bookingAreas.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">{text.dateFrom}</label>
                <input
                  className="form-control"
                  type="date"
                  disabled={isLoadingFilters}
                  value={bookingDateFrom}
                  onChange={(e) => setBookingDateFrom(e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">{text.dateTo}</label>
                <input
                  className="form-control"
                  type="date"
                  disabled={isLoadingFilters}
                  value={bookingDateTo}
                  onChange={(e) => setBookingDateTo(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="search-sec-btn search-btn" disabled={isLoadingFilters}>
              {text.search}
            </button>
          </form>
        ) : (
          <form className="search-frm g-search-form" onSubmit={handlePropertySearch}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">{text.section}</label>
                <select
                  className="form-select"
                  disabled={isLoadingFilters}
                  value={propertySectionId}
                  onChange={(e) => setPropertySectionId(e.target.value)}
                >
                  <option value="">{isLoadingFilters ? text.loading : text.allSections}</option>
                  {filters.sections.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">{text.propertyType}</label>
                <select
                  className="form-select"
                  disabled={isLoadingFilters}
                  value={propertyTypeId}
                  onChange={(e) => setPropertyTypeId(e.target.value)}
                >
                  <option value="">{isLoadingFilters ? text.loading : text.choose}</option>
                  {filters.propertyTypes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">{text.city}</label>
                <select
                  className="form-select"
                  disabled={isLoadingFilters}
                  value={propertyGovernorateId}
                  onChange={(e) => {
                    setPropertyGovernorateId(e.target.value)
                    setPropertyAreaId('')
                  }}
                >
                  <option value="">{isLoadingFilters ? text.loading : text.choose}</option>
                  {filters.governorates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">{text.area}</label>
                <select
                  className="form-select"
                  disabled={isLoadingFilters}
                  value={propertyAreaId}
                  onChange={(e) => setPropertyAreaId(e.target.value)}
                >
                  <option value="">{isLoadingFilters ? text.loading : text.choose}</option>
                  {propertyAreas.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">{text.priceFrom}</label>
                <input
                  type="number"
                  className="form-control"
                  disabled={isLoadingFilters}
                  value={priceFrom}
                  onChange={(e) => setPriceFrom(e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">{text.priceTo}</label>
                <input
                  type="number"
                  className="form-control"
                  disabled={isLoadingFilters}
                  value={priceTo}
                  onChange={(e) => setPriceTo(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="search-sec-btn search-btn" disabled={isLoadingFilters}>
              {text.search}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
