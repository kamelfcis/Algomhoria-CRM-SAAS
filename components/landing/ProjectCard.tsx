'use client'

import Link from 'next/link'

interface ProjectCardData {
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
}

export function ProjectCard({
  project,
  locale,
}: {
  project: ProjectCardData
  locale: 'ar' | 'en'
}) {
  const detailHref = `/${locale}/project/${project.id}`

  return (
    <div className="project-card-premium blog-item h-100 wow fadeInUp" data-wow-delay="0.2s">
      <div className="position-relative project-card-media">
        <img
          src={project.image_url || '/landing/img/feature-1.jpg'}
          className="img-fluid w-100"
          alt={project.title}
          style={{ height: 255, objectFit: 'cover' }}
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).src = '/landing/img/feature-1.jpg'
          }}
        />
        <div className="project-media-overlay"></div>
        {project.project_type && (
          <span className="badge bg-dark position-absolute project-type-badge" style={{ top: 14, right: 14 }}>
            {project.project_type}
          </span>
        )}
      </div>

      <div className="blog-content p-4 d-flex flex-column project-card-body" style={{ minHeight: 280 }}>
        <h5
          className="mb-2 project-card-title"
          style={{
            minHeight: 48,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {project.title}
        </h5>

        <p className="text-muted mb-3 project-card-location">
          <i className="fas fa-map-marker-alt me-2 text-primary"></i>
          {project.location || '-'}
        </p>

        <div className="d-flex flex-wrap gap-2 mb-3 project-card-specs">
          <span className="badge bg-light text-dark border project-spec-badge">
            <i className="fas fa-layer-group me-1 text-primary"></i>
            {locale === 'ar' ? 'الوحدات' : 'Units'}: {project.units_count}
          </span>
          <span className="badge bg-light text-dark border project-spec-badge">
            <i className="fas fa-building me-1 text-primary"></i>
            {locale === 'ar' ? 'المرافق' : 'Facilities'}: {project.facilities_count}
          </span>
          <span className="badge bg-light text-dark border project-spec-badge">
            <i className="fas fa-concierge-bell me-1 text-primary"></i>
            {locale === 'ar' ? 'الخدمات' : 'Services'}: {project.services_count}
          </span>
        </div>

        <p
          className="mb-4 project-card-description"
          style={{
            minHeight: 70,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {project.description || '-'}
        </p>

        <div className="mt-auto">
          <Link href={detailHref} className="btn rounded-pill py-2 px-4 project-card-cta">
            {locale === 'ar' ? 'تفاصيل المشروع' : 'Project Details'}
          </Link>
        </div>
      </div>
    </div>
  )
}
