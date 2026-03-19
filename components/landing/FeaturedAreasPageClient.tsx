'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { LandingGridSkeleton } from '@/components/landing/LandingSkeletons'

type Locale = 'ar' | 'en'

interface FeaturedArea {
  governorateId: string | null
  areaId: string | null
  locationLabel: string
  image_url: string | null
  projectCount: number
  categoryNames: string[]
}

interface Payload {
  items: FeaturedArea[]
  filters: {
    governorates: Array<{ id: string; name: string }>
    areas: Array<{ id: string; governorate_id: string | null; name: string }>
    categories: Array<{ id: string; name: string }>
  }
}

function getLocaleFromCookie(): Locale {
  if (typeof document === 'undefined') return 'en'
  const raw = document.cookie
    .split('; ')
    .find((row) => row.startsWith('locale='))
    ?.split('=')[1]
  return raw === 'ar' ? 'ar' : 'en'
}

export function FeaturedAreasPageClient({ forcedLocale }: { forcedLocale?: Locale }) {
  const [locale] = useState<Locale>(() => forcedLocale || getLocaleFromCookie())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Payload | null>(null)
  const [governorateId, setGovernorateId] = useState('')
  const [areaId, setAreaId] = useState('')
  const [categoryId, setCategoryId] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const params = new URLSearchParams({ locale })
        if (governorateId) params.set('governorateId', governorateId)
        if (areaId) params.set('areaId', areaId)
        if (categoryId) params.set('categoryId', categoryId)
        const response = await fetch(`/api/landing/featured-areas?${params.toString()}`, { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload?.error || 'Failed to load featured areas')
        setData(payload.data)
      } catch (err: any) {
        setError(err?.message || 'Failed to load featured areas')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [locale, governorateId, areaId, categoryId])

  const text = useMemo(
    () =>
      locale === 'ar'
        ? { title: 'المناطق المميزة', all: 'الكل', governorate: 'المحافظة', area: 'المنطقة', category: 'التصنيف', cta: 'استعرض المشاريع' }
        : { title: 'Featured Areas', all: 'All', governorate: 'Governorate', area: 'Area', category: 'Category', cta: 'Explore Projects' },
    [locale]
  )

  const areaOptions = (data?.filters.areas || []).filter(
    (item) => !governorateId || item.governorate_id === governorateId
  )

  return (
    <div className="container-fluid blog py-5">
      <div className="container py-5">
        <div className="text-center mx-auto pb-4" style={{ maxWidth: 900 }}>
          <h1 className="display-5 mb-3">{text.title}</h1>
        </div>

        <div className="card border-0 shadow-sm p-3 p-lg-4 mb-4 featured-areas-filters">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">{text.governorate}</label>
              <select className="form-select" value={governorateId} onChange={(e) => setGovernorateId(e.target.value)}>
                <option value="">{text.all}</option>
                {(data?.filters.governorates || []).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">{text.area}</label>
              <select className="form-select" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
                <option value="">{text.all}</option>
                {areaOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">{text.category}</label>
              <select className="form-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">{text.all}</option>
                {(data?.filters.categories || []).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading && <LandingGridSkeleton cards={6} />}
        {error && <p className="text-danger">{error}</p>}
        {!loading && !error && (
          <div className="row g-4">
            {(data?.items || []).map((item, idx) => (
              <div className="col-lg-4 col-md-6" key={`${item.governorateId || 'g'}-${item.areaId || 'a'}-${idx}`}>
                <div className="featured-area-card h-100">
                  <div
                    className="featured-area-card-media"
                    style={{ backgroundImage: `url('${item.image_url || '/landing/img/feature-1.jpg'}')` }}
                  />
                  <div className="featured-area-card-body">
                    <h5 className="featured-area-card-title mb-2">{item.locationLabel}</h5>
                    <p className="featured-area-top-project mb-2">
                      {locale === 'ar' ? 'عدد المشاريع' : 'Projects'}: {item.projectCount}
                    </p>
                    <div className="featured-area-chip-list mb-3">
                      {item.categoryNames.slice(0, 4).map((name) => (
                        <span className="featured-area-chip" key={name}>{name}</span>
                      ))}
                    </div>
                    <Link
                      href={`/projects?governorateId=${encodeURIComponent(item.governorateId || '')}&areaId=${encodeURIComponent(item.areaId || '')}`}
                      className="btn btn-primary rounded-pill"
                    >
                      {text.cta}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
