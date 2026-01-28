import Link from 'next/link'
import Image from 'next/image'

export function Footer() {
  return (
    <>
      {/* Footer Start */}
      <div className="container-fluid footer py-5 wow fadeIn" data-wow-delay="0.2s">
        <div className="container py-5">
          <div className="row g-5">
            <div className="col-md-6 col-lg-6 col-xl-4">
              <div className="footer-item">
                <Link href="/" className="p-0">
                  <h4 className="text-white mb-4">
                    <i className="fas fa-swimmer text-primary me-3"></i>Algomhoria
                  </h4>
                </Link>
                <p className="mb-2 text-white">
                  Algomhoria offers all services for searching and viewing apartments, villas, shops and more for free. 
                  If you are looking for an apartment for rent or ownership, or if you are an owner and want to offer it to reach the right buyer.
                </p>
                <div className="d-flex align-items-center">
                  <i className="fas fa-map-marker-alt text-primary me-3"></i>
                  <p className="text-white mb-0">18 Ahmed Heshmat st., Zamalek, Cairo</p>
                </div>
                <div className="d-flex align-items-center">
                  <i className="fas fa-envelope text-primary me-3"></i>
                  <p className="text-white mb-0">[email protected]</p>
                </div>
                <div className="d-flex align-items-center">
                  <i className="fa fa-phone-alt text-primary me-3"></i>
                  <p className="text-white mb-0">01288818000</p>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-6 col-xl-2">
              <div className="footer-item">
                <h4 className="text-white mb-4">Quick Links</h4>
                <Link href="/about" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> About Us
                </Link>
                <Link href="/feature" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> Feature
                </Link>
                <Link href="/service" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> Services
                </Link>
                <Link href="/properties" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> Properties
                </Link>
                <Link href="/blog" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> Blog
                </Link>
                <Link href="/contact" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> Contact us
                </Link>
              </div>
            </div>
            <div className="col-md-6 col-lg-6 col-xl-2">
              <div className="footer-item">
                <h4 className="text-white mb-4">Support</h4>
                <Link href="#" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> Privacy Policy
                </Link>
                <Link href="#" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> Terms & Conditions
                </Link>
                <Link href="#" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> Disclaimer
                </Link>
                <Link href="#" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> Support
                </Link>
                <Link href="#" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> FAQ
                </Link>
                <Link href="#" className="text-white" style={{ display: 'block', marginBottom: '8px', textDecoration: 'none' }}>
                  <i className="fas fa-angle-right me-2"></i> Help
                </Link>
              </div>
            </div>
            <div className="col-md-6 col-lg-6 col-xl-4">
              <div className="footer-item">
                <h4 className="text-white mb-4">Opening Hours</h4>
                <div className="opening-date mb-3 pb-3">
                  <div className="opening-clock flex-shrink-0">
                    <h6 className="text-white mb-0 me-auto">Monday - Friday:</h6>
                    <p className="mb-0 text-white">
                      <i className="fas fa-clock text-primary me-2"></i> 9:00 AM - 6:00 PM
                    </p>
                  </div>
                  <div className="opening-clock flex-shrink-0">
                    <h6 className="text-white mb-0 me-auto">Saturday - Sunday:</h6>
                    <p className="mb-0 text-white">
                      <i className="fas fa-clock text-primary me-2"></i> 10:00 AM - 4:00 PM
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-white mb-2">Payment Accepted</p>
                  <Image
                    src="/landing/img/payment.png"
                    alt="Payment Methods"
                    width={200}
                    height={50}
                    className="img-fluid"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Footer End */}

      {/* Copyright Start */}
      <div className="container-fluid copyright py-4">
        <div className="container">
          <div className="row g-4 align-items-center">
            <div className="col-md-6 text-center text-md-start mb-md-0">
              <span className="text-white">
                <Link href="#" className="border-bottom text-white" style={{ textDecoration: 'none' }}>
                  <i className="fas fa-copyright text-white me-2"></i>Algomhoria
                </Link>
                , All right reserved.
              </span>
            </div>
            <div className="col-md-6 text-center text-md-end text-white">
              <span>Powered By iLead Integrated Solutions ®</span>
            </div>
          </div>
        </div>
      </div>
      {/* Copyright End */}

      {/* Back to Top */}
      <a href="#" className="btn btn-primary btn-lg-square rounded-circle back-to-top">
        <i className="fa fa-arrow-up"></i>
      </a>
    </>
  )
}

