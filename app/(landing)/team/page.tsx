'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LandingGridSkeleton } from '@/components/landing/LandingSkeletons'

interface TeamMember {
  id: string
  name: string
  position: string
  image_url: string | null
}

export default function TeamPage() {
  const [locale, setLocale] = useState<'ar' | 'en'>('en')
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const nextLocale =
      document.cookie
        .split('; ')
        .find((row) => row.startsWith('locale='))
        ?.split('=')[1] === 'ar'
        ? 'ar'
        : 'en'
    setLocale(nextLocale)

    let cancelled = false
    const loadMembers = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/landing/team-users?locale=${nextLocale}`, { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload?.error || 'Failed to load team members')
        if (!cancelled) {
          setMembers(Array.isArray(payload?.data) ? payload.data : [])
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load team members')
          setMembers([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadMembers()
    return () => {
      cancelled = true
    }
  }, [])
  const isArabic = locale === 'ar'

  return (
    <>
      {/* Header Start */}
      <div className="container-fluid bg-breadcrumb">
        <div className="container text-center py-5" style={{ maxWidth: '900px' }}>
          <h4 className="text-white display-4 mb-4 wow fadeInDown" data-wow-delay="0.1s">
            {isArabic ? 'فريق العمل' : 'Our Team'}
          </h4>
          <ol className="breadcrumb d-flex justify-content-center mb-0 wow fadeInDown" data-wow-delay="0.3s">
            <li className="breadcrumb-item">
              <Link href="/">{isArabic ? 'الرئيسية' : 'Home'}</Link>
            </li>
            <li className="breadcrumb-item">
              <Link href="#">{isArabic ? 'الصفحات' : 'Pages'}</Link>
            </li>
            <li className="breadcrumb-item active text-primary">{isArabic ? 'الفريق' : 'Team'}</li>
          </ol>
        </div>
      </div>
      {/* Header End */}

      {/* Team Start */}
      <div className="container-fluid team pb-5">
        <div className="container pb-5">
          <div
            className="text-center mx-auto pb-5 wow fadeInUp"
            data-wow-delay="0.2s"
            style={{ maxWidth: '800px' }}
          >
            <h4 className="text-primary">{isArabic ? 'تعرف على فريقنا' : 'Meet Our Team'}</h4>
            <h1 className="display-5 mb-4">{isArabic ? 'أعضاء فريقنا المميز' : 'Our Dedicated Team Members'}</h1>
            <p className="mb-0">
              {isArabic
                ? 'فريق من المحترفين يجعل الجمهورية منصة عقارية موثوقة.'
                : 'Meet the professionals who make Algomhoria the trusted real estate platform it is today.'}
            </p>
          </div>
          {loading ? (
            <LandingGridSkeleton cards={6} />
          ) : error ? (
            <p className="text-center text-danger mb-0">{error}</p>
          ) : members.length === 0 ? (
            <p className="text-center text-muted mb-0">
              {isArabic ? 'لا يوجد أعضاء فريق حالياً.' : 'No active team members found.'}
            </p>
          ) : (
            <div className="row g-4 justify-content-center">
              {members.map((member, index) => (
                <div
                  className="col-md-6 col-lg-6 col-xl-4 wow fadeInUp"
                  data-wow-delay={`${0.2 + index * 0.2}s`}
                  key={member.id}
                >
                  <div className="team-item team-item-premium p-4">
                    <div className="team-content team-content-premium">
                      <div className="d-flex justify-content-between border-bottom pb-4 team-member-head">
                        <div className={`team-member-text ${isArabic ? 'text-end' : 'text-start'}`}>
                          <h4 className="mb-1 team-member-name">
                            {member.name || (isArabic ? 'عضو فريق' : 'Team Member')}
                          </h4>
                          <p className="mb-0 team-member-role">
                            {member.position || (isArabic ? 'عضو الفريق' : 'Team Member')}
                          </p>
                        </div>
                        <div className="team-avatar-wrap">
                          <img
                            src={member.image_url || '/landing/img/team-1.jpg'}
                            className="img-fluid rounded team-avatar-image"
                            style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                            alt={member.name || (isArabic ? 'عضو فريق' : 'Team Member')}
                            loading="lazy"
                            onError={(event) => {
                              const target = event.currentTarget as HTMLImageElement
                              if (target.src.includes('/landing/img/team-1.jpg')) return
                              target.src = '/landing/img/team-1.jpg'
                            }}
                          />
                        </div>
                      </div>
                      <div className="team-icon team-icon-premium rounded-pill my-4 p-3">
                        <a className="btn btn-primary btn-sm-square rounded-circle me-3" href="#">
                          <i className="fab fa-facebook-f"></i>
                        </a>
                        <a className="btn btn-primary btn-sm-square rounded-circle me-3" href="#">
                          <i className="fab fa-twitter"></i>
                        </a>
                        <a className="btn btn-primary btn-sm-square rounded-circle me-3" href="#">
                          <i className="fab fa-linkedin-in"></i>
                        </a>
                        <a className="btn btn-primary btn-sm-square rounded-circle me-0" href="#">
                          <i className="fab fa-instagram"></i>
                        </a>
                      </div>
                      <p className="text-center mb-0 team-member-summary">
                        {isArabic
                          ? 'عضو فعال في فريق الجمهورية العقارية.'
                          : 'An active member of Algomhoria real estate team.'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Team End */}
    </>
  )
}

