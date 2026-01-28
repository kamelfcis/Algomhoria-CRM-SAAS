import Image from 'next/image'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <>
      {/* Header Start */}
      <div className="container-fluid bg-breadcrumb">
        <div className="container text-center py-5" style={{ maxWidth: '900px' }}>
          <h4 className="text-white display-4 mb-4 wow fadeInDown" data-wow-delay="0.1s">
            About Us
          </h4>
          <ol className="breadcrumb d-flex justify-content-center mb-0 wow fadeInDown" data-wow-delay="0.3s">
            <li className="breadcrumb-item">
              <Link href="/">Home</Link>
            </li>
            <li className="breadcrumb-item">
              <Link href="#">Pages</Link>
            </li>
            <li className="breadcrumb-item active text-primary">About</li>
          </ol>
        </div>
      </div>
      {/* Header End */}

      {/* About Start */}
      <div className="container-fluid about py-5">
        <div className="container py-5">
          <div className="row g-5">
            <div className="col-xl-6 wow fadeInUp" data-wow-delay="0.2s">
              <div>
                <h4 className="text-primary">About Algomhoria</h4>
                <h1 className="display-5 mb-4">
                  Your Trusted Real Estate Partner
                </h1>
                <p className="mb-5">
                  Algomhoria offers all services for searching and viewing apartments, villas, shops and more for free. 
                  If you are looking for an apartment for rent or ownership, or if you are an owner and want to offer it to reach the right buyer.
                </p>
                <div className="row g-4">
                  <div className="col-md-6">
                    <div className="d-flex">
                      <div className="me-3">
                        <i className="fas fa-home fa-3x text-primary"></i>
                      </div>
                      <div>
                        <h4>Wide Selection</h4>
                        <p>Thousands of properties across Egypt</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="d-flex">
                      <div className="me-3">
                        <i className="fas fa-search fa-3x text-primary"></i>
                      </div>
                      <div>
                        <h4>Easy Search</h4>
                        <p>Find properties quickly and easily</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="d-flex">
                      <div className="me-3">
                        <i className="fas fa-hand-holding-usd fa-3x text-primary"></i>
                      </div>
                      <div>
                        <h4>Free Service</h4>
                        <p>No fees for property listings</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="d-flex">
                      <div className="me-3">
                        <i className="fas fa-shield-alt fa-3x text-primary"></i>
                      </div>
                      <div>
                        <h4>Trusted Platform</h4>
                        <p>Verified properties and owners</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-6 wow fadeInUp" data-wow-delay="0.4s">
              <div className="position-relative rounded">
                <div className="rounded" style={{ marginTop: '40px' }}>
                  <div className="row g-0">
                    <div className="col-lg-12">
                      <div className="rounded mb-4">
                        <Image
                          src="/landing/img/about.jpg"
                          className="img-fluid rounded w-100"
                          alt="About Algomhoria"
                          width={600}
                          height={400}
                        />
                      </div>
                      <div className="row gx-4 gy-0">
                        <div className="col-6">
                          <div className="counter-item bg-primary rounded text-center p-4 h-100">
                            <div className="counter-item-icon mx-auto mb-3">
                              <i className="fas fa-thumbs-up fa-3x text-white"></i>
                            </div>
                            <div className="counter-counting mb-3">
                              <span
                                className="text-white fs-2 fw-bold"
                                data-toggle="counter-up"
                              >
                                23
                              </span>
                              <span className="h1 fw-bold text-white">K +</span>
                            </div>
                            <h5 className="text-white mb-0">Properties</h5>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="counter-item bg-dark rounded text-center p-4 h-100">
                            <div className="counter-item-icon mx-auto mb-3">
                              <i className="fas fa-certificate fa-3x text-white"></i>
                            </div>
                            <div className="counter-counting mb-3">
                              <span
                                className="text-white fs-2 fw-bold"
                                data-toggle="counter-up"
                              >
                                150
                              </span>
                              <span className="h1 fw-bold text-white"> +</span>
                            </div>
                            <h5 className="text-white mb-0">Happy Clients</h5>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className="rounded bg-primary p-4 position-absolute d-flex justify-content-center"
                  style={{
                    width: '90%',
                    height: '80px',
                    top: '-40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                >
                  <h3 className="mb-0 text-white">Trusted Real Estate Platform</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* About End */}
    </>
  )
}

