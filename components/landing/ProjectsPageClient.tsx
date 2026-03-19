'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ProjectCard } from '@/components/landing/ProjectCard'
import { LandingGridSkeleton } from '@/components/landing/LandingSkeletons'

type Locale = 'ar' | 'en'

interface ProjectsPayload {
  items: Array<any>
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

export function ProjectsPageClient({ forcedLocale }: { forcedLocale?: Locale }) {
  const searchParams = useSearchParams()
  const [locale] = useState<Locale>(() => forcedLocale || getLocaleFromCookie())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ProjectsPayload | null>(null)
  const [governorateId, setGovernorateId] = useState('')
  const [areaId, setAreaId] = useState('')
  const [categoryId, setCategoryId] = useState('')

  useEffect(() => {
    setGovernorateId(searchParams.get('governorateId') || '')
    setAreaId(searchParams.get('areaId') || '')
    setCategoryId(searchParams.get('categoryId') || '')
  }, [searchParams])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const params = new URLSearchParams({ locale })
        if (governorateId) params.set('governorateId', governorateId)
        if (areaId) params.set('areaId', areaId)
        if (categoryId) params.set('categoryId', categoryId)
        const response = await fetch(`/api/landing/projects?${params.toString()}`, { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload?.error || 'Failed to load projects')
        setData(payload.data)
      } catch (err: any) {
        setError(err?.message || 'Failed to load projects')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [locale, governorateId, areaId, categoryId])

  const text = useMemo(
    () =>
      locale === 'ar'
        ? {
            title: 'المشاريع',
            governorate: 'المحافظة',
            area: 'المنطقة',
            category: 'التصنيف',
            all: 'الكل',
          }
        : {
            title: 'Projects',
            governorate: 'Governorate',
            area: 'Area',
            category: 'Category',
            all: 'All',
          },
    [locale]
  )

  const areaOptions = (data?.filters.areas || []).filter(
    (area) => !governorateId || area.governorate_id === governorateId
  )

  return (
    <div className="container-fluid blog py-5">
      <div className="container py-5">
        <div className="text-center mx-auto pb-4" style={{ maxWidth: 900 }}>
          <h1 className="display-5 mb-3">{text.title}</h1>
        </div>

        <div className="card border-0 shadow-sm p-3 p-lg-4 mb-4 projects-filters">
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
            {(data?.items || []).map((project) => (
              <div className="col-lg-4 col-md-6" key={project.id}>
                <ProjectCard project={project} locale={locale} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
