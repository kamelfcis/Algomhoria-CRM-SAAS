import Link from 'next/link'

export default function ContactPage() {
  return (
    <>
      {/* Header Start */}
      <div className="container-fluid bg-breadcrumb">
        <div className="container text-center py-5" style={{ maxWidth: '900px' }}>
          <h4 className="text-white display-4 mb-4 wow fadeInDown" data-wow-delay="0.1s">
            Contact Us
          </h4>
          <ol className="breadcrumb d-flex justify-content-center mb-0 wow fadeInDown" data-wow-delay="0.3s">
            <li className="breadcrumb-item">
              <Link href="/">Home</Link>
            </li>
            <li className="breadcrumb-item">
              <Link href="#">Pages</Link>
            </li>
            <li className="breadcrumb-item active text-primary">Contact</li>
          </ol>
        </div>
      </div>
      {/* Header End */}

      {/* Contact Start */}
      <div className="container-fluid contact py-5">
        <div className="container py-5">
          <div className="row g-5">
            <div className="col-12 col-xl-6 wow fadeInUp" data-wow-delay="0.2s">
              <div>
                <h4 className="text-primary">Get In Touch</h4>
                <h1 className="display-5 mb-4">Contact For Any Query</h1>
                <p className="mb-4">
                  Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                </p>
                <div className="d-flex align-items-center mb-4">
                  <div className="btn-square bg-primary rounded-circle me-3">
                    <i className="fas fa-map-marker-alt text-white"></i>
                  </div>
                  <div>
                    <h5 className="mb-0">Address</h5>
                    <p className="mb-0">18 Ahmed Heshmat st., Zamalek, Cairo</p>
                  </div>
                </div>
                <div className="d-flex align-items-center mb-4">
                  <div className="btn-square bg-primary rounded-circle me-3">
                    <i className="fas fa-envelope text-white"></i>
                  </div>
                  <div>
                    <h5 className="mb-0">Email</h5>
                    <p className="mb-0">[email protected]</p>
                  </div>
                </div>
                <div className="d-flex align-items-center">
                  <div className="btn-square bg-primary rounded-circle me-3">
                    <i className="fa fa-phone-alt text-white"></i>
                  </div>
                  <div>
                    <h5 className="mb-0">Phone</h5>
                    <p className="mb-0">01288818000</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-xl-6 wow fadeInUp" data-wow-delay="0.4s">
              <div className="contact-form bg-light rounded p-5">
                <h2 className="text-dark mb-4">Send Message</h2>
                <form>
                  <div className="row g-4">
                    <div className="col-12 col-md-6">
                      <input
                        type="text"
                        className="form-control border-0 py-3"
                        placeholder="Your Name"
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <input
                        type="email"
                        className="form-control border-0 py-3"
                        placeholder="Your Email"
                      />
                    </div>
                    <div className="col-12">
                      <input
                        type="text"
                        className="form-control border-0 py-3"
                        placeholder="Subject"
                      />
                    </div>
                    <div className="col-12">
                      <textarea
                        className="form-control border-0 py-3"
                        rows={5}
                        placeholder="Message"
                      ></textarea>
                    </div>
                    <div className="col-12">
                      <button className="btn btn-primary w-100 py-3" type="submit">
                        Send Message
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Contact End */}
    </>
  )
}

