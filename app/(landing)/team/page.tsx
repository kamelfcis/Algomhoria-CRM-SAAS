import Image from 'next/image'
import Link from 'next/link'

export default function TeamPage() {
  return (
    <>
      {/* Header Start */}
      <div className="container-fluid bg-breadcrumb">
        <div className="container text-center py-5" style={{ maxWidth: '900px' }}>
          <h4 className="text-white display-4 mb-4 wow fadeInDown" data-wow-delay="0.1s">
            Our Team
          </h4>
          <ol className="breadcrumb d-flex justify-content-center mb-0 wow fadeInDown" data-wow-delay="0.3s">
            <li className="breadcrumb-item">
              <Link href="/">Home</Link>
            </li>
            <li className="breadcrumb-item">
              <Link href="#">Pages</Link>
            </li>
            <li className="breadcrumb-item active text-primary">Team</li>
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
            <h4 className="text-primary">Meet Our Team</h4>
            <h1 className="display-5 mb-4">Our Dedicated Team Members</h1>
            <p className="mb-0">
              Meet the professionals who make Algomhoria the trusted real estate platform it is today.
            </p>
          </div>
          <div className="row g-4 justify-content-center">
            <div className="col-md-6 col-lg-6 col-xl-4 wow fadeInUp" data-wow-delay="0.2s">
              <div className="team-item p-4">
                <div className="team-content">
                  <div className="d-flex justify-content-between border-bottom pb-4">
                    <div className="text-start">
                      <h4 className="mb-0">Team Member</h4>
                      <p className="mb-0">Real Estate Agent</p>
                    </div>
                    <div>
                      <Image
                        src="/landing/img/team-1.jpg"
                        className="img-fluid rounded"
                        style={{ width: '100px', height: '100px' }}
                        alt="Team Member"
                        width={100}
                        height={100}
                      />
                    </div>
                  </div>
                  <div className="team-icon rounded-pill my-4 p-3">
                    <a
                      className="btn btn-primary btn-sm-square rounded-circle me-3"
                      href="#"
                    >
                      <i className="fab fa-facebook-f"></i>
                    </a>
                    <a
                      className="btn btn-primary btn-sm-square rounded-circle me-3"
                      href="#"
                    >
                      <i className="fab fa-twitter"></i>
                    </a>
                    <a
                      className="btn btn-primary btn-sm-square rounded-circle me-3"
                      href="#"
                    >
                      <i className="fab fa-linkedin-in"></i>
                    </a>
                    <a
                      className="btn btn-primary btn-sm-square rounded-circle me-0"
                      href="#"
                    >
                      <i className="fab fa-instagram"></i>
                    </a>
                  </div>
                  <p className="text-center mb-0">
                    Experienced real estate professional dedicated to helping you find your perfect property.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-6 col-xl-4 wow fadeInUp" data-wow-delay="0.4s">
              <div className="team-item p-4">
                <div className="team-content">
                  <div className="d-flex justify-content-between border-bottom pb-4">
                    <div className="text-start">
                      <h4 className="mb-0">Team Member</h4>
                      <p className="mb-0">Property Consultant</p>
                    </div>
                    <div>
                      <Image
                        src="/landing/img/team-2.jpg"
                        className="img-fluid rounded"
                        style={{ width: '100px', height: '100px' }}
                        alt="Team Member"
                        width={100}
                        height={100}
                      />
                    </div>
                  </div>
                  <div className="team-icon rounded-pill my-4 p-3">
                    <a
                      className="btn btn-primary btn-sm-square rounded-circle me-3"
                      href="#"
                    >
                      <i className="fab fa-facebook-f"></i>
                    </a>
                    <a
                      className="btn btn-primary btn-sm-square rounded-circle me-3"
                      href="#"
                    >
                      <i className="fab fa-twitter"></i>
                    </a>
                    <a
                      className="btn btn-primary btn-sm-square rounded-circle me-3"
                      href="#"
                    >
                      <i className="fab fa-linkedin-in"></i>
                    </a>
                    <a
                      className="btn btn-primary btn-sm-square rounded-circle me-0"
                      href="#"
                    >
                      <i className="fab fa-instagram"></i>
                    </a>
                  </div>
                  <p className="text-center mb-0">
                    Expert consultant providing valuable insights and guidance for your property needs.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-6 col-xl-4 wow fadeInUp" data-wow-delay="0.6s">
              <div className="team-item p-4">
                <div className="team-content">
                  <div className="d-flex justify-content-between border-bottom pb-4">
                    <div className="text-start">
                      <h4 className="mb-0">Team Member</h4>
                      <p className="mb-0">Customer Support</p>
                    </div>
                    <div>
                      <Image
                        src="/landing/img/team-3.jpg"
                        className="img-fluid rounded"
                        style={{ width: '100px', height: '100px' }}
                        alt="Team Member"
                        width={100}
                        height={100}
                      />
                    </div>
                  </div>
                  <div className="team-icon rounded-pill my-4 p-3">
                    <a
                      className="btn btn-primary btn-sm-square rounded-circle me-3"
                      href="#"
                    >
                      <i className="fab fa-facebook-f"></i>
                    </a>
                    <a
                      className="btn btn-primary btn-sm-square rounded-circle me-3"
                      href="#"
                    >
                      <i className="fab fa-twitter"></i>
                    </a>
                    <a
                      className="btn btn-primary btn-sm-square rounded-circle me-3"
                      href="#"
                    >
                      <i className="fab fa-linkedin-in"></i>
                    </a>
                    <a
                      className="btn btn-primary btn-sm-square rounded-circle me-0"
                      href="#"
                    >
                      <i className="fab fa-instagram"></i>
                    </a>
                  </div>
                  <p className="text-center mb-0">
                    Dedicated support team ensuring you have the best experience with Algomhoria.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Team End */}
    </>
  )
}

