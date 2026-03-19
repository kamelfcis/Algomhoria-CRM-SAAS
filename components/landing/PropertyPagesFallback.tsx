export function PropertyPagesFallback() {
  return (
    <div className="container-fluid blog py-5">
      <div className="container py-5">
        <div className="row g-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div className="col-lg-4 col-md-6" key={`property-fallback-${idx}`}>
              <div className="card border-0 shadow-sm h-100 overflow-hidden">
                <div
                  className="placeholder-glow"
                  style={{ height: 220, background: '#e9ecef' }}
                >
                  <span className="placeholder w-100 h-100 d-block"></span>
                </div>
                <div className="p-3">
                  <p className="placeholder-glow mb-2">
                    <span className="placeholder col-8"></span>
                  </p>
                  <p className="placeholder-glow mb-2">
                    <span className="placeholder col-6"></span>
                  </p>
                  <p className="placeholder-glow mb-0">
                    <span className="placeholder col-4"></span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
