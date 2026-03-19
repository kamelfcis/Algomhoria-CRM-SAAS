'use client'

export function LandingGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="row g-4">
      {Array.from({ length: cards }).map((_, idx) => (
        <div className="col-md-6 col-lg-4" key={`skeleton-${idx}`}>
          <div className="landing-skeleton-card">
            <div className="landing-skeleton shimmer" style={{ height: 220 }} />
            <div className="p-3">
              <div className="landing-skeleton shimmer mb-2" style={{ height: 18, width: '80%' }} />
              <div className="landing-skeleton shimmer mb-2" style={{ height: 14, width: '55%' }} />
              <div className="landing-skeleton shimmer mb-2" style={{ height: 14, width: '90%' }} />
              <div className="landing-skeleton shimmer" style={{ height: 14, width: '70%' }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function LandingDetailsSkeleton() {
  return (
    <div className="container-fluid py-5">
      <div className="container py-5">
        <div className="landing-skeleton-card p-3 mb-4">
          <div className="landing-skeleton shimmer mb-3" style={{ height: 30, width: '62%' }} />
          <div className="landing-skeleton shimmer" style={{ height: 18, width: '40%' }} />
        </div>
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="landing-skeleton-card p-2 mb-3">
              <div className="landing-skeleton shimmer" style={{ height: 460 }} />
            </div>
            <div className="row g-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div className="col-3" key={`thumb-${i}`}>
                  <div className="landing-skeleton shimmer" style={{ height: 85, borderRadius: 10 }} />
                </div>
              ))}
            </div>
            <div className="landing-skeleton-card p-4 mt-4">
              <div className="landing-skeleton shimmer mb-3" style={{ height: 22, width: '35%' }} />
              <div className="landing-skeleton shimmer mb-2" style={{ height: 14, width: '100%' }} />
              <div className="landing-skeleton shimmer mb-2" style={{ height: 14, width: '95%' }} />
              <div className="landing-skeleton shimmer" style={{ height: 14, width: '70%' }} />
            </div>
          </div>
          <div className="col-lg-4">
            <div className="landing-skeleton-card p-4 mb-3">
              <div className="landing-skeleton shimmer mb-2" style={{ height: 16, width: '100%' }} />
              <div className="landing-skeleton shimmer mb-2" style={{ height: 16, width: '88%' }} />
              <div className="landing-skeleton shimmer mb-2" style={{ height: 16, width: '92%' }} />
              <div className="landing-skeleton shimmer" style={{ height: 16, width: '70%' }} />
            </div>
            <div className="landing-skeleton-card p-4">
              <div className="landing-skeleton shimmer mb-2" style={{ height: 42 }} />
              <div className="landing-skeleton shimmer mb-2" style={{ height: 42 }} />
              <div className="landing-skeleton shimmer" style={{ height: 42 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
