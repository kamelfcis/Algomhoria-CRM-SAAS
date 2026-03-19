'use client'

import { useEffect, useState } from 'react'
import { LandingDetailsSkeleton } from '@/components/landing/LandingSkeletons'

interface ProjectDetails {
  id: string
  title: string
  description: string
  category: string
  project_type: string
  status: string
  location: string
  address: string
  latitude: number | null
  longitude: number | null
  images: string[]
  youtube_videos: string[]
  facilities: string[]
  services: string[]
  units: string[]
}

function toEmbedUrl(url: string) {
  const clean = url.trim()
  const short = clean.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/)
  if (short?.[1]) return `https://www.youtube.com/embed/${short[1]}`
  const regular = clean.match(/[?&]v=([a-zA-Z0-9_-]{6,})/)
  if (regular?.[1]) return `https://www.youtube.com/embed/${regular[1]}`
  if (clean.includes('youtube.com/embed/')) return clean
  return null
}

export function ProjectDetailsClient({
  id,
  forcedLocale,
}: {
  id: string
  forcedLocale?: 'ar' | 'en'
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ProjectDetails | null>(null)
  const [activeImage, setActiveImage] = useState(0)
  const [locale, setLocale] = useState<'ar' | 'en'>(forcedLocale || 'en')

  useEffect(() => {
    const cookieLocale =
      typeof document !== 'undefined'
        ? document.cookie
            .split('; ')
            .find((x) => x.startsWith('locale='))
            ?.split('=')[1] === 'ar'
          ? 'ar'
          : 'en'
        : 'en'

    const locale = forcedLocale || cookieLocale
    setLocale(locale)

    const run = async () => {
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), 12000)
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/landing/projects/${id}?locale=${locale}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload?.error || 'Failed to load project')
        setData(payload.data)
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          setError(
            locale === 'ar'
              ? 'انتهت مهلة التحميل. حاول مرة اخرى.'
              : 'Loading timed out. Please try again.'
          )
          return
        }
        setError(err?.message || 'Failed to load project')
      } finally {
        window.clearTimeout(timeoutId)
        setLoading(false)
      }
    }

    run()
  }, [id, forcedLocale])

  if (loading) return <LandingDetailsSkeleton />
  if (error || !data) {
    return (
      <div className="container py-5 text-danger">
        {error || (locale === 'ar' ? 'غير موجود' : 'Not found')}
      </div>
    )
  }

  const gallery = data.images.length > 0 ? data.images : ['/landing/img/feature-1.jpg']
  const activeSrc = gallery[Math.min(activeImage, gallery.length - 1)]
  const text = locale === 'ar'
    ? {
        description: 'الوصف',
        videos: 'الفيديوهات',
        specs: 'مواصفات المشروع',
        location: 'الموقع',
        address: 'العنوان',
        latitude: 'خط العرض',
        longitude: 'خط الطول',
        units: 'الوحدات',
        facilities: 'المرافق',
        services: 'الخدمات',
        noData: 'لا توجد بيانات',
      }
    : {
        description: 'Description',
        videos: 'Videos',
        specs: 'Project Specs',
        location: 'Location',
        address: 'Address',
        latitude: 'Latitude',
        longitude: 'Longitude',
        units: 'Units',
        facilities: 'Facilities',
        services: 'Services',
        noData: 'No data',
      }

  return (
    <div className="container-fluid project-detail-page py-5">
      <div className="container py-5">
        <div className="project-top-card mb-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <h1 className="display-6 mb-0">{data.title}</h1>
            <div className="d-flex flex-wrap gap-2">
              {data.category && <span className="project-tag project-tag-yellow">{data.category}</span>}
              {data.project_type && <span className="project-tag project-tag-dark">{data.project_type}</span>}
              {data.status && <span className="project-tag project-tag-green text-uppercase">{data.status}</span>}
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-8">
            <div className="project-surface p-2">
              <img
                src={activeSrc}
                alt={data.title}
                className="img-fluid rounded"
                style={{ width: '100%', height: 500, objectFit: 'cover' }}
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).src = '/landing/img/feature-1.jpg'
                }}
              />
            </div>
            <div className="row g-2 mt-2">
              {gallery.slice(0, 10).map((img, index) => (
                <div className="col-3" key={`${img}-${index}`}>
                  <button
                    type="button"
                    className={`p-0 border-0 w-100 project-thumb-btn ${index === activeImage ? 'active' : ''}`}
                    style={{ background: 'transparent', borderRadius: 10, overflow: 'hidden' }}
                    onClick={() => setActiveImage(index)}
                  >
                    <img
                      src={img}
                      alt={`${data.title}-${index}`}
                      className="img-fluid rounded"
                      style={{ width: '100%', height: 95, objectFit: 'cover' }}
                    />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 project-surface p-4">
              <h4 className="mb-3">{text.description}</h4>
              {data.description ? (
                <div
                  style={{ lineHeight: 1.85 }}
                  dangerouslySetInnerHTML={{ __html: data.description }}
                />
              ) : (
                <p>-</p>
              )}
            </div>

            {data.youtube_videos.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-3">{text.videos}</h4>
                <div className="row g-3">
                  {data.youtube_videos.slice(0, 4).map((video) => {
                    const embed = toEmbedUrl(video)
                    if (!embed) return null
                    return (
                      <div className="col-md-6" key={video}>
                        <div className="ratio ratio-16x9">
                          <iframe src={embed} title={video} allowFullScreen />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="col-lg-4">
            <div className="project-surface p-4 h-100">
              <h4 className="mb-4 project-title-accent">{text.specs}</h4>
              <div className="project-spec-meta">
                <div className="project-spec-meta-row">
                  <span>{text.location}</span>
                  <strong>{data.location || '-'}</strong>
                </div>
                <div className="project-spec-meta-row">
                  <span>{text.address}</span>
                  <strong>{data.address || '-'}</strong>
                </div>
                <div className="project-spec-meta-row">
                  <span>{text.latitude}</span>
                  <strong>{data.latitude ?? '-'}</strong>
                </div>
                <div className="project-spec-meta-row">
                  <span>{text.longitude}</span>
                  <strong>{data.longitude ?? '-'}</strong>
                </div>
              </div>

              <div className="project-spec-stats">
                <div className="project-spec-stat">
                  <small>{text.units}</small>
                  <strong>{data.units.length}</strong>
                </div>
                <div className="project-spec-stat">
                  <small>{text.facilities}</small>
                  <strong>{data.facilities.length}</strong>
                </div>
                <div className="project-spec-stat">
                  <small>{text.services}</small>
                  <strong>{data.services.length}</strong>
                </div>
              </div>

              <div className="project-spec-block">
                <h6>{text.units}</h6>
                <div className="d-flex flex-wrap gap-2">
                  {data.units.length > 0
                    ? data.units.map((x) => (
                        <span className="project-chip project-chip-premium" key={x}>{x}</span>
                      ))
                    : <span className="text-muted">{text.noData}</span>}
                </div>
              </div>

              <div className="project-spec-block">
                <h6>{text.facilities}</h6>
                <div className="d-flex flex-wrap gap-2">
                  {data.facilities.length > 0
                    ? data.facilities.map((x) => (
                        <span className="project-chip project-chip-premium" key={x}>{x}</span>
                      ))
                    : <span className="text-muted">{text.noData}</span>}
                </div>
              </div>

              <div className="project-spec-block">
                <h6>{text.services}</h6>
                <div className="d-flex flex-wrap gap-2">
                  {data.services.length > 0
                    ? data.services.map((x) => (
                        <span className="project-chip project-chip-premium" key={x}>{x}</span>
                      ))
                    : <span className="text-muted">{text.noData}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
