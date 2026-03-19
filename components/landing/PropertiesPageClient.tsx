'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { PropertyCard } from '@/components/landing/PropertyCard'
import { LandingGridSkeleton } from '@/components/landing/LandingSkeletons'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

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

type SectionMode = 'all' | 'sale' | 'rent'

interface FilterOption {
  id: string
  name: string
}

interface AreaFilterOption extends FilterOption {
  governorate_id: string | null
}

interface FiltersMeta {
  priceMin: number
  priceMax: number
  priceStep: number
  governorates: FilterOption[]
  areas: AreaFilterOption[]
  propertyTypes: FilterOption[]
}

function getLocaleFromCookie(): 'ar' | 'en' {
  if (typeof document === 'undefined') return 'en'
  const raw = document.cookie
    .split('; ')
    .find((row) => row.startsWith('locale='))
    ?.split('=')[1]
  return raw === 'ar' ? 'ar' : 'en'
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function PropertiesPageClient({
  initialSection = 'all',
  heading,
  forcedLocale,
  forcedSectionId,
}: {
  initialSection?: SectionMode
  heading?: { ar: string; en: string }
  forcedLocale?: 'ar' | 'en'
  forcedSectionId?: string
}) {
  const ITEMS_PER_PAGE = 9
  const normalizedForcedSectionId = String(forcedSectionId || '').trim()
  const lockSaleSection = initialSection === 'sale'
  const lockForcedSectionId = Boolean(normalizedForcedSectionId)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [properties, setProperties] = useState<PropertyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [locale] = useState<'ar' | 'en'>(() => forcedLocale || getLocaleFromCookie())
  const [currentPage, setCurrentPage] = useState(1)

  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const [area, setArea] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [section, setSection] = useState<SectionMode>(initialSection)
  const [priceFrom, setPriceFrom] = useState('')
  const [priceTo, setPriceTo] = useState('')
  const [areaFrom, setAreaFrom] = useState('')
  const [areaTo, setAreaTo] = useState('')
  const [governorateId, setGovernorateId] = useState('')
  const [areaId, setAreaId] = useState('')
  const [propertyTypeId, setPropertyTypeId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [filtersMeta, setFiltersMeta] = useState<FiltersMeta>({
    priceMin: 0,
    priceMax: 1000000,
    priceStep: 1000,
    governorates: [],
    areas: [],
    propertyTypes: [],
  })
  const [sliderPriceFrom, setSliderPriceFrom] = useState(0)
  const [sliderPriceTo, setSliderPriceTo] = useState(1000000)
  const activeRequest = useRef<AbortController | null>(null)
  const gridTopRef = useRef<HTMLDivElement | null>(null)
  const hasPageInteractedRef = useRef(false)

  useEffect(() => {
    if (lockForcedSectionId) return
    setSection(initialSection)
  }, [initialSection, lockForcedSectionId])

  useEffect(() => {
    if (!lockSaleSection || lockForcedSectionId) return
    setSection('sale')
    setSectionId('')
  }, [lockSaleSection, lockForcedSectionId])

  useEffect(() => {
    if (!lockForcedSectionId) return
    setSectionId(normalizedForcedSectionId)
  }, [lockForcedSectionId, normalizedForcedSectionId])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const activeLocale = forcedLocale || getLocaleFromCookie()
        const params = new URLSearchParams({ locale: activeLocale, section: initialSection })
        const response = await fetch(`/api/landing/filters?${params.toString()}`, {
          cache: 'no-store',
        })
        const payload = await response.json()
        if (!response.ok || cancelled) return
        const nextMin = Number(payload?.data?.priceMin ?? 0)
        const nextMax = Number(payload?.data?.priceMax ?? 1000000)
        const nextStep = Number(payload?.data?.priceStep ?? 1000)
        const safeMin = 0
        const safeMax = Number.isFinite(nextMax) ? Math.max(safeMin + 1000, nextMax) : 1000000
        const safeStep = Number.isFinite(nextStep) && nextStep > 0 ? nextStep : 1000
        const governorates = Array.isArray(payload?.data?.governorates)
          ? payload.data.governorates
              .map((item: any) => ({
                id: String(item?.id || ''),
                name: String(item?.name || ''),
              }))
              .filter((item: FilterOption) => item.id && item.name)
          : []
        const areas = Array.isArray(payload?.data?.areas)
          ? payload.data.areas
              .map((item: any) => ({
                id: String(item?.id || ''),
                name: String(item?.name || ''),
                governorate_id: item?.governorate_id ? String(item.governorate_id) : null,
              }))
              .filter((item: AreaFilterOption) => item.id && item.name)
          : []
        const propertyTypes = Array.isArray(payload?.data?.propertyTypes)
          ? payload.data.propertyTypes
              .map((item: any) => ({
                id: String(item?.id || ''),
                name: String(item?.name || ''),
              }))
              .filter((item: FilterOption) => item.id && item.name)
          : []
        setFiltersMeta({
          priceMin: safeMin,
          priceMax: safeMax,
          priceStep: safeStep,
          governorates,
          areas,
          propertyTypes,
        })
        setSliderPriceFrom((prev) => clampNumber(prev, safeMin, safeMax))
        setSliderPriceTo((prev) => clampNumber(prev, safeMin, safeMax))
      } catch {
        // Keep default bounds if metadata fails.
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [forcedLocale, initialSection])

  const title = useMemo(() => {
    if (heading) return locale === 'ar' ? heading.ar : heading.en
    return locale === 'ar' ? 'العقارات' : 'Properties'
  }, [heading, locale])

  const formatPrice = (value: number) => {
    try {
      return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US').format(value)
    } catch {
      return String(value)
    }
  }

  const governorateOptions = useMemo(
    () =>
      filtersMeta.governorates.map((item) => ({
        value: item.id,
        label: item.name,
      })),
    [filtersMeta.governorates]
  )

  const filteredAreaOptions = useMemo(
    () =>
      filtersMeta.areas
        .filter((item) => !governorateId || item.governorate_id === governorateId)
        .map((item) => ({
          value: item.id,
          label: item.name,
        })),
    [filtersMeta.areas, governorateId]
  )

  const propertyTypeOptions = useMemo(
    () =>
      filtersMeta.propertyTypes.map((item) => ({
        value: item.id,
        label: item.name,
      })),
    [filtersMeta.propertyTypes]
  )

  const governoratesMap = useMemo(
    () => new Map(filtersMeta.governorates.map((item) => [item.id, item.name])),
    [filtersMeta.governorates]
  )

  const areasMap = useMemo(
    () => new Map(filtersMeta.areas.map((item) => [item.id, item.name])),
    [filtersMeta.areas]
  )

  const propertyTypesMap = useMemo(
    () => new Map(filtersMeta.propertyTypes.map((item) => [item.id, item.name])),
    [filtersMeta.propertyTypes]
  )

  const sliderRangeSpan = Math.max(1, filtersMeta.priceMax - filtersMeta.priceMin)
  const sliderStartPercent = clampNumber(
    ((sliderPriceFrom - filtersMeta.priceMin) / sliderRangeSpan) * 100,
    0,
    100
  )
  const sliderEndPercent = clampNumber(
    ((sliderPriceTo - filtersMeta.priceMin) / sliderRangeSpan) * 100,
    0,
    100
  )

  const load = async (
    nextLocale: 'ar' | 'en',
    overrides?: Partial<{
      q: string
      city: string
      area: string
      propertyType: string
      section: SectionMode
      priceFrom: string
      priceTo: string
      areaFrom: string
      areaTo: string
      governorateId: string
      areaId: string
      propertyTypeId: string
      sectionId: string
    }>
  ) => {
    try {
      activeRequest.current?.abort()
      const controller = new AbortController()
      activeRequest.current = controller
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({ locale: nextLocale })
      const nextQ = overrides?.q ?? q
      const nextCity = overrides?.city ?? city
      const nextArea = overrides?.area ?? area
      const nextPropertyType = overrides?.propertyType ?? propertyType
      const nextSection = overrides?.section ?? section
      const nextPriceFrom = overrides?.priceFrom ?? priceFrom
      const nextPriceTo = overrides?.priceTo ?? priceTo
      const nextAreaFrom = overrides?.areaFrom ?? areaFrom
      const nextAreaTo = overrides?.areaTo ?? areaTo
      const nextGovernorateId = overrides?.governorateId ?? governorateId
      const nextAreaId = overrides?.areaId ?? areaId
      const nextPropertyTypeId = overrides?.propertyTypeId ?? propertyTypeId
      const nextSectionId = overrides?.sectionId ?? sectionId

      if (nextQ.trim()) params.set('q', nextQ.trim())
      if (nextCity.trim()) params.set('city', nextCity.trim())
      if (nextArea.trim()) params.set('area', nextArea.trim())
      if (nextPropertyType.trim()) params.set('propertyType', nextPropertyType.trim())
      if (nextSection !== 'all') params.set('section', nextSection)
      if (nextPriceFrom.trim()) params.set('priceFrom', nextPriceFrom.trim())
      if (nextPriceTo.trim()) params.set('priceTo', nextPriceTo.trim())
      if (nextAreaFrom.trim()) params.set('areaFrom', nextAreaFrom.trim())
      if (nextAreaTo.trim()) params.set('areaTo', nextAreaTo.trim())
      if (nextGovernorateId.trim()) params.set('governorateId', nextGovernorateId.trim())
      if (nextAreaId.trim()) params.set('areaId', nextAreaId.trim())
      if (nextPropertyTypeId.trim()) params.set('propertyTypeId', nextPropertyTypeId.trim())
      if (nextSectionId.trim()) params.set('sectionId', nextSectionId.trim())

      const response = await fetch(`/api/landing/properties?${params.toString()}`, {
        cache: 'no-store',
        signal: controller.signal,
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Failed to load properties')
      setProperties(payload.data || [])
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      setError(err?.message || 'Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const activeLocale = forcedLocale || getLocaleFromCookie()

    const nextQ = searchParams.get('q') || ''
    const nextCity = searchParams.get('city') || ''
    const nextArea = searchParams.get('area') || ''
    const nextPropertyType = searchParams.get('propertyType') || ''
    const nextSection = lockSaleSection
      ? 'sale'
      : ((searchParams.get('section') as SectionMode) || initialSection)
    const nextPriceFrom = searchParams.get('priceFrom') || ''
    const nextPriceTo = searchParams.get('priceTo') || ''
    const nextAreaFrom = searchParams.get('areaFrom') || ''
    const nextAreaTo = searchParams.get('areaTo') || ''
    const nextGovernorateId = searchParams.get('governorateId') || ''
    const nextAreaId = searchParams.get('areaId') || ''
    const nextPropertyTypeId = searchParams.get('propertyTypeId') || ''
    const nextSectionId = lockForcedSectionId
      ? normalizedForcedSectionId
      : (searchParams.get('sectionId') || '')
    const hasFromInput = nextPriceFrom.trim().length > 0
    const hasToInput = nextPriceTo.trim().length > 0
    const parsedFrom = hasFromInput ? Number(nextPriceFrom) : NaN
    const parsedTo = hasToInput ? Number(nextPriceTo) : NaN
    const hasFrom = hasFromInput && Number.isFinite(parsedFrom) && parsedFrom >= 0
    const hasTo = hasToInput && Number.isFinite(parsedTo) && parsedTo >= 0
    const safeFrom = hasFrom
      ? clampNumber(parsedFrom, filtersMeta.priceMin, filtersMeta.priceMax)
      : filtersMeta.priceMin
    const safeTo = hasTo
      ? clampNumber(parsedTo, filtersMeta.priceMin, filtersMeta.priceMax)
      : filtersMeta.priceMax
    const orderedFrom = Math.min(safeFrom, safeTo)
    const orderedTo = Math.max(safeFrom, safeTo)

    setQ(nextQ)
    setCity(nextCity)
    setArea(nextArea)
    setPropertyType(nextPropertyType)
    setSection(nextSection)
    setPriceFrom(hasFrom ? String(orderedFrom) : '')
    setPriceTo(hasTo ? String(orderedTo) : '')
    setAreaFrom(nextAreaFrom)
    setAreaTo(nextAreaTo)
    setGovernorateId(nextGovernorateId)
    setAreaId(nextAreaId)
    setPropertyTypeId(nextPropertyTypeId)
    setSectionId(nextSectionId)
    setSliderPriceFrom(orderedFrom)
    setSliderPriceTo(orderedTo)

    load(activeLocale, {
      q: nextQ,
      city: nextCity,
      area: nextArea,
      propertyType: nextPropertyType,
      section: nextSection,
      priceFrom: hasFrom ? String(orderedFrom) : '',
      priceTo: hasTo ? String(orderedTo) : '',
      areaFrom: nextAreaFrom,
      areaTo: nextAreaTo,
      governorateId: nextGovernorateId,
      areaId: nextAreaId,
      propertyTypeId: nextPropertyTypeId,
      sectionId: nextSectionId,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    forcedLocale,
    initialSection,
    searchParams,
    filtersMeta.priceMin,
    filtersMeta.priceMax,
    lockSaleSection,
    lockForcedSectionId,
    normalizedForcedSectionId,
  ])

  useEffect(() => {
    return () => activeRequest.current?.abort()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [properties.length, section])

  const totalPages = Math.max(1, Math.ceil(properties.length / ITEMS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedProperties = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE
    return properties.slice(start, start + ITEMS_PER_PAGE)
  }, [properties, safeCurrentPage])

  const buildPaginationRange = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages] as Array<number | string>
    }
    if (safeCurrentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as Array<number | string>
    }
    return [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages] as Array<number | string>
  }

  const paginationItems = buildPaginationRange()

  useEffect(() => {
    if (!hasPageInteractedRef.current) return
    gridTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [safeCurrentPage])

  const buildParams = (
    overrides?: Partial<{
      q: string
      city: string
      area: string
      propertyType: string
      section: SectionMode
      priceFrom: string
      priceTo: string
      areaFrom: string
      areaTo: string
      governorateId: string
      areaId: string
      propertyTypeId: string
      sectionId: string
    }>
  ) => {
    const params = new URLSearchParams({ locale })
    const next = {
      q: overrides?.q ?? q,
      city: overrides?.city ?? city,
      area: overrides?.area ?? area,
      propertyType: overrides?.propertyType ?? propertyType,
      section: lockSaleSection ? 'sale' : (overrides?.section ?? section),
      priceFrom: overrides?.priceFrom ?? priceFrom,
      priceTo: overrides?.priceTo ?? priceTo,
      areaFrom: overrides?.areaFrom ?? areaFrom,
      areaTo: overrides?.areaTo ?? areaTo,
      governorateId: overrides?.governorateId ?? governorateId,
      areaId: overrides?.areaId ?? areaId,
      propertyTypeId: overrides?.propertyTypeId ?? propertyTypeId,
      sectionId: lockForcedSectionId
        ? normalizedForcedSectionId
        : (overrides?.sectionId ?? sectionId),
    }
    if (next.q.trim()) params.set('q', next.q.trim())
    if (next.city.trim()) params.set('city', next.city.trim())
    if (next.area.trim()) params.set('area', next.area.trim())
    if (next.propertyType.trim()) params.set('propertyType', next.propertyType.trim())
    if (next.section !== 'all') params.set('section', next.section)
    if (next.priceFrom.trim()) params.set('priceFrom', next.priceFrom.trim())
    if (next.priceTo.trim()) params.set('priceTo', next.priceTo.trim())
    if (next.areaFrom.trim()) params.set('areaFrom', next.areaFrom.trim())
    if (next.areaTo.trim()) params.set('areaTo', next.areaTo.trim())
    if (next.governorateId.trim()) params.set('governorateId', next.governorateId.trim())
    if (next.areaId.trim()) params.set('areaId', next.areaId.trim())
    if (next.propertyTypeId.trim()) params.set('propertyTypeId', next.propertyTypeId.trim())
    if (next.sectionId.trim()) params.set('sectionId', next.sectionId.trim())
    return params
  }

  const syncUrl = (
    overrides?: Partial<{
      q: string
      city: string
      area: string
      propertyType: string
      section: SectionMode
      priceFrom: string
      priceTo: string
      areaFrom: string
      areaTo: string
      governorateId: string
      areaId: string
      propertyTypeId: string
      sectionId: string
    }>
  ) => {
    const params = buildParams(overrides)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  useEffect(() => {
    if (!governorateId || !areaId) return
    const valid = filtersMeta.areas.some(
      (item) => item.id === areaId && item.governorate_id === governorateId
    )
    if (!valid) setAreaId('')
  }, [governorateId, areaId, filtersMeta.areas])

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string }> = []
    if (q.trim()) chips.push({ key: 'q', label: `${locale === 'ar' ? 'بحث' : 'Search'}: ${q.trim()}` })
    if (governorateId.trim()) {
      chips.push({
        key: 'governorateId',
        label: `${locale === 'ar' ? 'المحافظة' : 'Governorate'}: ${
          governoratesMap.get(governorateId) || governorateId
        }`,
      })
    } else if (city.trim()) {
      chips.push({ key: 'city', label: `${locale === 'ar' ? 'المدينة' : 'City'}: ${city.trim()}` })
    }
    if (areaId.trim()) {
      chips.push({
        key: 'areaId',
        label: `${locale === 'ar' ? 'المنطقة' : 'Area'}: ${areasMap.get(areaId) || areaId}`,
      })
    } else if (area.trim()) {
      chips.push({ key: 'area', label: `${locale === 'ar' ? 'المنطقة' : 'Area'}: ${area.trim()}` })
    }
    if (propertyTypeId.trim()) {
      chips.push({
        key: 'propertyTypeId',
        label: `${locale === 'ar' ? 'نوع العقار' : 'Property Type'}: ${
          propertyTypesMap.get(propertyTypeId) || propertyTypeId
        }`,
      })
    } else if (propertyType.trim()) {
      chips.push({ key: 'propertyType', label: `${locale === 'ar' ? 'النوع' : 'Type'}: ${propertyType.trim()}` })
    }
    if (!lockSaleSection && !lockForcedSectionId && section !== 'all') {
      chips.push({ key: 'section', label: `${locale === 'ar' ? 'القسم' : 'Section'}: ${section}` })
    }
    if (priceFrom.trim() || priceTo.trim()) {
      chips.push({
        key: 'price',
        label: `${locale === 'ar' ? 'السعر' : 'Price'}: ${priceFrom || filtersMeta.priceMin} - ${priceTo || filtersMeta.priceMax}`,
      })
    }
    if (areaFrom.trim() || areaTo.trim()) {
      chips.push({
        key: 'size',
        label: `${locale === 'ar' ? 'المساحة' : 'Area'}: ${areaFrom || 0} - ${
          areaTo || (locale === 'ar' ? 'الكل' : 'Any')
        }`,
      })
    }
    return chips
  }, [
    q,
    city,
    area,
    propertyType,
    governorateId,
    areaId,
    propertyTypeId,
    section,
    priceFrom,
    priceTo,
    areaFrom,
    areaTo,
    locale,
    filtersMeta.priceMin,
    filtersMeta.priceMax,
    governoratesMap,
    areasMap,
    propertyTypesMap,
    lockSaleSection,
    lockForcedSectionId,
  ])

  const clearAllFilters = () => {
    setQ('')
    setCity('')
    setArea('')
    setPropertyType('')
    setSection(initialSection)
    setPriceFrom('')
    setPriceTo('')
    setAreaFrom('')
    setAreaTo('')
    setGovernorateId('')
    setAreaId('')
    setPropertyTypeId('')
    setSectionId(lockForcedSectionId ? normalizedForcedSectionId : '')
    setSliderPriceFrom(filtersMeta.priceMin)
    setSliderPriceTo(filtersMeta.priceMax)
    setCurrentPage(1)
    syncUrl({
      q: '',
      city: '',
      area: '',
      propertyType: '',
      section: initialSection,
      priceFrom: '',
      priceTo: '',
      areaFrom: '',
      areaTo: '',
      governorateId: '',
      areaId: '',
      propertyTypeId: '',
      sectionId: lockForcedSectionId ? normalizedForcedSectionId : '',
    })
  }

  const onFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const hasFromInput = priceFrom.trim().length > 0
    const hasToInput = priceTo.trim().length > 0
    const hasAnyPriceInput = hasFromInput || hasToInput

    const normalizedFrom = clampNumber(
      hasFromInput && Number.isFinite(Number(priceFrom)) && Number(priceFrom) >= 0
        ? Number(priceFrom)
        : filtersMeta.priceMin,
      filtersMeta.priceMin,
      filtersMeta.priceMax
    )
    const normalizedTo = clampNumber(
      hasToInput && Number.isFinite(Number(priceTo)) && Number(priceTo) >= 0
        ? Number(priceTo)
        : filtersMeta.priceMax,
      filtersMeta.priceMin,
      filtersMeta.priceMax
    )
    const orderedFrom = Math.min(normalizedFrom, normalizedTo)
    const orderedTo = Math.max(normalizedFrom, normalizedTo)
    setSliderPriceFrom(orderedFrom)
    setSliderPriceTo(orderedTo)
    setPriceFrom(hasAnyPriceInput ? String(orderedFrom) : '')
    setPriceTo(hasAnyPriceInput ? String(orderedTo) : '')
    setCurrentPage(1)
    syncUrl({
      priceFrom: hasAnyPriceInput ? String(orderedFrom) : '',
      priceTo: hasAnyPriceInput ? String(orderedTo) : '',
    })
  }

  return (
    <div className="container-fluid blog py-5">
      <div className="container py-5">
        <div className="text-center mx-auto pb-5 wow fadeInUp" data-wow-delay="0.1s" style={{ maxWidth: 900 }}>
          <h1 className="display-5 mb-4">{title}</h1>
        </div>

        <div className="row g-4 align-items-start">
          <div className={`col-lg-3 ${locale === 'ar' ? 'order-lg-2' : 'order-lg-1'}`}>
            <form
              className="booking-ticket-form landing-sale-filter-panel"
              onSubmit={onFilterSubmit}
              dir={locale === 'ar' ? 'rtl' : 'ltr'}
            >
              <div className="landing-sale-filter-header mb-3">
                <h5 className="mb-1">{locale === 'ar' ? 'بحث ذكي فاخر' : 'Premium Smart Search'}</h5>
                <p className="mb-0">{locale === 'ar' ? 'فلترة أسرع ونتائج أدق' : 'Sharper filtering and better results'}</p>
              </div>

              <div className="row g-3">
                <div className="col-12">
                  <input
                    className="form-control booking-form-control"
                    placeholder={locale === 'ar' ? 'بحث' : 'Search'}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
                <div className="col-sm-6 col-lg-12">
                  <label className="landing-range-label mb-1">{locale === 'ar' ? 'المحافظة' : 'Governorate'}</label>
                  <SearchableSelect
                    value={governorateId || 'all'}
                    onValueChange={(value) => {
                      const nextGovernorateId = value === 'all' ? '' : value
                      setGovernorateId(nextGovernorateId)
                      setAreaId('')
                      setCity('')
                      setArea('')
                    }}
                    placeholder={locale === 'ar' ? 'كل المحافظات' : 'All governorates'}
                    searchPlaceholder={locale === 'ar' ? 'ابحث عن المحافظة...' : 'Search governorate...'}
                    options={[
                      { value: 'all', label: locale === 'ar' ? 'كل المحافظات' : 'All governorates' },
                      ...governorateOptions,
                    ]}
                    className="form-control booking-form-control landing-searchable-trigger"
                  />
                </div>
                <div className="col-sm-6 col-lg-12">
                  <label className="landing-range-label mb-1">{locale === 'ar' ? 'المنطقة' : 'Area'}</label>
                  <SearchableSelect
                    value={areaId || 'all'}
                    onValueChange={(value) => {
                      setAreaId(value === 'all' ? '' : value)
                      setArea('')
                    }}
                    placeholder={locale === 'ar' ? 'كل المناطق' : 'All areas'}
                    searchPlaceholder={locale === 'ar' ? 'ابحث عن المنطقة...' : 'Search area...'}
                    options={[
                      { value: 'all', label: locale === 'ar' ? 'كل المناطق' : 'All areas' },
                      ...filteredAreaOptions,
                    ]}
                    disabled={filteredAreaOptions.length === 0}
                    className="form-control booking-form-control landing-searchable-trigger"
                  />
                </div>
                <div className="col-12">
                  <label className="landing-range-label mb-1">{locale === 'ar' ? 'نوع العقار' : 'Property Type'}</label>
                  <SearchableSelect
                    value={propertyTypeId || 'all'}
                    onValueChange={(value) => {
                      setPropertyTypeId(value === 'all' ? '' : value)
                      setPropertyType('')
                    }}
                    placeholder={locale === 'ar' ? 'كل الأنواع' : 'All property types'}
                    searchPlaceholder={locale === 'ar' ? 'ابحث عن نوع العقار...' : 'Search property type...'}
                    options={[
                      { value: 'all', label: locale === 'ar' ? 'كل الأنواع' : 'All property types' },
                      ...propertyTypeOptions,
                    ]}
                    className="form-control booking-form-control landing-searchable-trigger"
                  />
                </div>

                <div className="col-12">
                  {lockSaleSection || lockForcedSectionId ? (
                    <div className="landing-locked-section-badge">
                      {lockSaleSection
                        ? (locale === 'ar' ? 'القسم: للبيع فقط' : 'Section: For Sale only')
                        : (locale === 'ar' ? 'القسم: محدد مسبقًا' : 'Section: Preselected')}
                    </div>
                  ) : (
                    <select
                      className="form-select booking-form-control"
                      value={section}
                      onChange={(e) => {
                        setSection((e.target.value as SectionMode) || 'all')
                        if (!lockForcedSectionId) {
                          setSectionId('')
                        }
                      }}
                    >
                      <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                      <option value="sale">{locale === 'ar' ? 'للبيع' : 'For Sale'}</option>
                      <option value="rent">{locale === 'ar' ? 'للايجار' : 'For Rent'}</option>
                    </select>
                  )}
                </div>

                <div className="col-12">
                  <div className="landing-price-slider-card">
                    <div className="landing-price-slider-head">
                      <strong>{locale === 'ar' ? 'نطاق السعر الذكي' : 'Smart Price Range'}</strong>
                      <span>
                        {formatPrice(sliderPriceFrom)} - {formatPrice(sliderPriceTo)}
                      </span>
                    </div>
                    <div className="landing-price-slider-track-wrap">
                      <div className="landing-price-slider-base-track" />
                      <div
                        className="landing-price-slider-active-track"
                        style={{
                          insetInlineStart: `${sliderStartPercent}%`,
                          insetInlineEnd: `${100 - sliderEndPercent}%`,
                        }}
                      />
                      <input
                        type="range"
                        min={filtersMeta.priceMin}
                        max={filtersMeta.priceMax}
                        step={filtersMeta.priceStep}
                        value={sliderPriceFrom}
                        className="landing-price-range-input"
                        onChange={(e) => {
                          const rawValue = Number(e.target.value)
                          const nextValue = clampNumber(
                            Math.min(rawValue, sliderPriceTo),
                            filtersMeta.priceMin,
                            filtersMeta.priceMax
                          )
                          setSliderPriceFrom(nextValue)
                          setPriceFrom(String(nextValue))
                        }}
                      />
                      <input
                        type="range"
                        min={filtersMeta.priceMin}
                        max={filtersMeta.priceMax}
                        step={filtersMeta.priceStep}
                        value={sliderPriceTo}
                        className="landing-price-range-input"
                        onChange={(e) => {
                          const rawValue = Number(e.target.value)
                          const nextValue = clampNumber(
                            Math.max(rawValue, sliderPriceFrom),
                            filtersMeta.priceMin,
                            filtersMeta.priceMax
                          )
                          setSliderPriceTo(nextValue)
                          setPriceTo(String(nextValue))
                        }}
                      />
                    </div>
                    <div className="row g-2 mt-2">
                      <div className="col-6">
                        <label className="landing-range-label">{locale === 'ar' ? 'من' : 'From'}</label>
                        <input
                          className="form-control booking-form-control landing-range-input"
                          placeholder={locale === 'ar' ? 'السعر من' : 'Price From'}
                          value={priceFrom}
                          onChange={(e) => {
                            const rawValue = Number(e.target.value || 0)
                            const safeValue = clampNumber(rawValue, filtersMeta.priceMin, sliderPriceTo)
                            setPriceFrom(e.target.value)
                            setSliderPriceFrom(safeValue)
                          }}
                        />
                      </div>
                      <div className="col-6">
                        <label className="landing-range-label">{locale === 'ar' ? 'إلى' : 'To'}</label>
                        <input
                          className="form-control booking-form-control landing-range-input"
                          placeholder={locale === 'ar' ? 'السعر الى' : 'Price To'}
                          value={priceTo}
                          onChange={(e) => {
                            const rawValue = Number(e.target.value || 0)
                            const safeValue = clampNumber(rawValue, sliderPriceFrom, filtersMeta.priceMax)
                            setPriceTo(e.target.value)
                            setSliderPriceTo(safeValue)
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-sm-6 col-lg-12">
                  <input
                    className="form-control booking-form-control"
                    placeholder={locale === 'ar' ? 'المساحة من' : 'Area From'}
                    value={areaFrom}
                    onChange={(e) => setAreaFrom(e.target.value)}
                  />
                </div>
                <div className="col-sm-6 col-lg-12">
                  <input
                    className="form-control booking-form-control"
                    placeholder={locale === 'ar' ? 'المساحة الى' : 'Area To'}
                    value={areaTo}
                    onChange={(e) => setAreaTo(e.target.value)}
                  />
                </div>

                <div className="col-12 d-grid gap-2">
                  <button className="btn btn-primary rounded-pill booking-submit-btn" type="submit">
                    {locale === 'ar' ? 'بحث فاخر' : 'Smart Search'}
                  </button>
                  <button className="btn btn-outline-secondary rounded-pill" type="button" onClick={clearAllFilters}>
                    {locale === 'ar' ? 'إعادة ضبط' : 'Reset'}
                  </button>
                  <p className="mb-0 mt-1 text-muted small text-center">
                    {locale === 'ar'
                      ? 'يتم تطبيق الفلاتر بعد الضغط على بحث'
                      : 'Filters apply only after clicking Search'}
                  </p>
                </div>
              </div>
            </form>
          </div>

          <div className={`col-lg-9 ${locale === 'ar' ? 'order-lg-1' : 'order-lg-2'}`}>
            {activeFilterChips.length > 0 && (
              <div className="landing-active-filter-chips mb-4">
                {activeFilterChips.map((chip) => (
                  <span key={chip.key} className="landing-filter-chip">
                    {chip.label}
                  </span>
                ))}
              </div>
            )}

            {loading && <LandingGridSkeleton cards={6} />}
            {error && <p className="text-danger">{error}</p>}

            <div ref={gridTopRef} />
            {!loading && (
              <div className="row g-4">
                {paginatedProperties.map((property) => (
                  <div className="col-lg-4 col-md-6" key={property.id}>
                    <PropertyCard property={property} />
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && properties.length > ITEMS_PER_PAGE && (
              <div className="landing-premium-pagination-wrap mt-5">
                <div className="landing-premium-pagination-info">
                  {locale === 'ar'
                    ? `عرض ${(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1} - ${Math.min(safeCurrentPage * ITEMS_PER_PAGE, properties.length)} من ${properties.length}`
                    : `Showing ${(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1} - ${Math.min(safeCurrentPage * ITEMS_PER_PAGE, properties.length)} of ${properties.length}`}
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
                    {locale === 'ar' ? 'السابق' : 'Prev'}
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
                    {locale === 'ar' ? 'التالي' : 'Next'}
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
      </div>
    </div>
  )
}
