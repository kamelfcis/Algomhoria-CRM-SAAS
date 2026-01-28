import Link from 'next/link'

export default function ServicePage() {
  return (
    <>
      {/* Header Start */}
      <div className="container-fluid bg-breadcrumb">
        <div className="container text-center py-5" style={{ maxWidth: '900px' }}>
          <h4 className="text-white display-4 mb-4 wow fadeInDown" data-wow-delay="0.1s">
            Our Services
          </h4>
          <ol className="breadcrumb d-flex justify-content-center mb-0 wow fadeInDown" data-wow-delay="0.3s">
            <li className="breadcrumb-item">
              <Link href="/">Home</Link>
            </li>
            <li className="breadcrumb-item">
              <Link href="#">Pages</Link>
            </li>
            <li className="breadcrumb-item active text-primary">Service</li>
          </ol>
        </div>
      </div>
      {/* Header End */}

      {/* Service Start */}
      <div className="container-fluid service py-5" style={{ marginTop: '100px' }}>
        <div className="container service-section py-5">
          <div
            className="text-center mx-auto pb-5 wow fadeInUp"
            data-wow-delay="0.2s"
            style={{ maxWidth: '800px' }}
          >
            <h4 className="text-primary">Our Service</h4>
            <h1 className="display-5 text-white mb-4">
              Explore Algomhoria Services
            </h1>
            <p className="mb-0 text-white">
              We offer comprehensive real estate services to help you find your perfect property or list your property for free.
            </p>
          </div>
          <div className="row g-4">
            <div className="col-md-6 col-lg-6 col-xl-3 wow fadeInUp" data-wow-delay="0.2s">
              <div className="service-item p-4">
                <div className="service-content">
                  <div className="mb-4">
                    <i className="fas fa-home fa-4x"></i>
                  </div>
                  <Link href="/properties" className="h4 d-inline-block mb-3">
                    Property Search
                  </Link>
                  <p className="mb-0">
                    Search through thousands of properties for sale and rent across Egypt.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-6 col-xl-3 wow fadeInUp" data-wow-delay="0.4s">
              <div className="service-item p-4">
                <div className="service-content">
                  <div className="mb-4">
                    <i className="fas fa-plus-circle fa-4x"></i>
                  </div>
                  <Link href="/properties" className="h4 d-inline-block mb-3">
                    Free Listing
                  </Link>
                  <p className="mb-0">
                    List your property for free and reach thousands of potential buyers.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-6 col-xl-3 wow fadeInUp" data-wow-delay="0.6s">
              <div className="service-item p-4">
                <div className="service-content">
                  <div className="mb-4">
                    <i className="fas fa-calendar-check fa-4x"></i>
                  </div>
                  <Link href="/bookings" className="h4 d-inline-block mb-3">
                    Property Viewing
                  </Link>
                  <p className="mb-0">
                    Schedule property viewings and consultations with our team.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-6 col-xl-3 wow fadeInUp" data-wow-delay="0.8s">
              <div className="service-item p-4">
                <div className="service-content">
                  <div className="mb-4">
                    <i className="fas fa-headset fa-4x"></i>
                  </div>
                  <Link href="/contact" className="h4 d-inline-block mb-3">
                    Expert Support
                  </Link>
                  <p className="mb-0">
                    Get expert advice and support throughout your property journey.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Service End */}
    </>
  )
}

