'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Script from 'next/script'

export default function HomePage() {
  useEffect(() => {
    // Wait for scripts to load
    const initCarousel = () => {
      if (typeof window !== 'undefined' && (window as any).jQuery) {
        const $ = (window as any).jQuery
        if ($.fn.owlCarousel && $('.header-carousel').length > 0) {
          // Check if already initialized
          if (!$('.header-carousel').data('owl.carousel')) {
            $('.header-carousel').owlCarousel({
              animateOut: 'slideOutDown',
              items: 1,
              autoplay: true,
              smartSpeed: 500,
              dots: false,
              loop: true,
              nav: true,
              navText: [
                '<i class="bi bi-arrow-left"></i>',
                '<i class="bi bi-arrow-right"></i>',
              ],
            })
          }
        }
      }
    }

    // Hide spinner
    const hideSpinner = () => {
      const spinner = document.getElementById('spinner')
      if (spinner) {
        spinner.classList.remove('show')
        setTimeout(() => {
          spinner.style.display = 'none'
        }, 500)
      }
    }

    // Try to initialize immediately
    const tryInit = () => {
      if (typeof window !== 'undefined' && (window as any).jQuery && (window as any).jQuery.fn.owlCarousel) {
        initCarousel()
        hideSpinner()
      } else {
        // Retry after a short delay
        setTimeout(tryInit, 100)
      }
    }

    // Start trying after a short delay to allow scripts to load
    setTimeout(tryInit, 500)

    // Also try when window loads
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        setTimeout(() => {
          initCarousel()
          hideSpinner()
        }, 100)
      })
    }
  }, [])

  return (
    <>
      {/* Carousel Start */}
      <div className="header-carousel owl-carousel">
        <div className="header-carousel-item">
          <Image
            src="/landing/img/carousel-1.jpg"
            className="img-fluid w-100"
            alt="Image"
            width={1920}
            height={1080}
            priority
          />
          <div className="carousel-caption">
            <div className="container align-items-center py-4">
              <div className="row g-5 align-items-center">
                <div
                  className="col-xl-7 fadeInLeft animated"
                  data-animation="fadeInLeft"
                  data-delay="1s"
                  style={{ animationDelay: '1s' }}
                >
                  <div className="text-start">
                    <h4 className="text-primary text-uppercase fw-bold mb-4">
                      Welcome To Algomhoria
                    </h4>
                    <h1 className="display-4 text-uppercase text-white mb-4">
                      Your Pathway to Home Sweet Home
                    </h1>
                    <p className="mb-4 fs-5">
                      More than Property, We Offer Possibilities. Find your dream property with ease.
                    </p>
                    <div className="d-flex flex-shrink-0">
                      <Link
                        className="btn btn-primary rounded-pill text-white py-3 px-5"
                        href="/properties"
                      >
                        Browse Properties
                      </Link>
                    </div>
                  </div>
                </div>
                <div
                  className="col-xl-5 fadeInRight animated"
                  data-animation="fadeInRight"
                  data-delay="1s"
                  style={{ animationDelay: '1s' }}
                >
                  <div className="ticket-form p-5">
                    <h2 className="text-dark text-uppercase mb-4">Search Property</h2>
                    <form>
                      <div className="row g-4">
                        <div className="col-12">
                          <input
                            type="text"
                            className="form-control border-0 py-2"
                            id="name"
                            placeholder="Property Type"
                          />
                        </div>
                        <div className="col-12 col-xl-6">
                          <input
                            type="text"
                            className="form-control border-0 py-2"
                            id="location"
                            placeholder="Location"
                          />
                        </div>
                        <div className="col-12 col-xl-6">
                          <select className="form-select border-0 py-2">
                            <option>For Sale</option>
                            <option>For Rent</option>
                            <option>For Sale or Rent</option>
                          </select>
                        </div>
                        <div className="col-12">
                          <input
                            className="form-control border-0 py-2"
                            type="date"
                            placeholder="Date"
                          />
                        </div>
                        <div className="col-12">
                          <button
                            type="button"
                            className="btn btn-primary w-100 py-2 px-5"
                          >
                            Search Now
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="header-carousel-item">
          <Image
            src="/landing/img/carousel-2.jpg"
            className="img-fluid w-100"
            alt="Image"
            width={1920}
            height={1080}
            priority
          />
          <div className="carousel-caption">
            <div className="container py-4">
              <div className="row g-5 align-items-center">
                <div
                  className="col-xl-7 fadeInLeft animated"
                  data-animation="fadeInLeft"
                  data-delay="1s"
                  style={{ animationDelay: '1s' }}
                >
                  <div className="text-start">
                    <h4 className="text-primary text-uppercase fw-bold mb-4">
                      Welcome To Algomhoria
                    </h4>
                    <h1 className="display-4 text-uppercase text-white mb-4">
                      Find Your Perfect Property
                    </h1>
                    <p className="mb-4 fs-5">
                      Explore thousands of properties for sale and rent across Egypt.
                    </p>
                    <div className="d-flex flex-shrink-0">
                      <Link
                        className="btn btn-primary rounded-pill text-white py-3 px-5"
                        href="/properties"
                      >
                        View Properties
                      </Link>
                    </div>
                  </div>
                </div>
                <div
                  className="col-xl-5 fadeInRight animated"
                  data-animation="fadeInRight"
                  data-delay="1s"
                  style={{ animationDelay: '1s' }}
                >
                  <div className="ticket-form p-5">
                    <h2 className="text-dark text-uppercase mb-4">Search Property</h2>
                    <form>
                      <div className="row g-4">
                        <div className="col-12">
                          <input
                            type="text"
                            className="form-control border-0 py-2"
                            id="name"
                            placeholder="Property Type"
                          />
                        </div>
                        <div className="col-12 col-xl-6">
                          <input
                            type="text"
                            className="form-control border-0 py-2"
                            id="location"
                            placeholder="Location"
                          />
                        </div>
                        <div className="col-12 col-xl-6">
                          <select className="form-select border-0 py-2">
                            <option>For Sale</option>
                            <option>For Rent</option>
                            <option>For Sale or Rent</option>
                          </select>
                        </div>
                        <div className="col-12">
                          <input
                            className="form-control border-0 py-2"
                            type="date"
                            placeholder="Date"
                          />
                        </div>
                        <div className="col-12">
                          <button
                            type="button"
                            className="btn btn-primary w-100 py-2 px-5"
                          >
                            Search Now
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Carousel End */}

      {/* Feature Start */}
      <div className="container-fluid feature py-5">
        <div className="container py-5">
          <div className="row g-4">
            <div className="col-lg-4 wow fadeInUp" data-wow-delay="0.2s">
              <div className="feature-item" style={{ position: 'relative', borderRadius: '10px', background: 'var(--bs-light)', overflow: 'hidden' }}>
                <img
                  src="/landing/img/feature-1.jpg"
                  className="img-fluid rounded w-100"
                  alt="Best Properties"
                  style={{ display: 'block', width: '100%', height: 'auto' }}
                />
                <div className="feature-content p-4" style={{ position: 'absolute', width: '100%', height: '100%', bottom: 0, left: 0, background: 'rgba(0, 0, 0, 0.7)', borderRadius: '10px', zIndex: 2, display: 'flex', alignItems: 'flex-end' }}>
                  <div className="feature-content-inner" style={{ position: 'relative', zIndex: 5 }}>
                    <h4 className="text-white">Best Properties</h4>
                    <p className="text-white">
                      Find the best properties in prime locations across Egypt. From apartments to villas, we have it all.
                    </p>
                    <Link
                      href="/properties"
                      className="btn btn-primary rounded-pill py-2 px-4"
                      style={{ color: 'white', textDecoration: 'none' }}
                    >
                      Read More <i className="fa fa-arrow-right ms-1"></i>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-4 wow fadeInUp" data-wow-delay="0.4s">
              <div className="feature-item" style={{ position: 'relative', borderRadius: '10px', background: 'var(--bs-light)', overflow: 'hidden' }}>
                <img
                  src="/landing/img/feature-2.jpg"
                  className="img-fluid rounded w-100"
                  alt="Easy Search"
                  style={{ display: 'block', width: '100%', height: 'auto' }}
                />
                <div className="feature-content p-4" style={{ position: 'absolute', width: '100%', height: '100%', bottom: 0, left: 0, background: 'rgba(0, 0, 0, 0.7)', borderRadius: '10px', zIndex: 2, display: 'flex', alignItems: 'flex-end' }}>
                  <div className="feature-content-inner" style={{ position: 'relative', zIndex: 5 }}>
                    <h4 className="text-white">Easy Search</h4>
                    <p className="text-white">
                      Search by location, price, type, and more. Find exactly what you're looking for in seconds.
                    </p>
                    <Link
                      href="/properties"
                      className="btn btn-primary rounded-pill py-2 px-4"
                      style={{ color: 'white', textDecoration: 'none' }}
                    >
                      Read More <i className="fa fa-arrow-right ms-1"></i>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-4 wow fadeInUp" data-wow-delay="0.6s">
              <div className="feature-item" style={{ position: 'relative', borderRadius: '10px', background: 'var(--bs-light)', overflow: 'hidden' }}>
                <img
                  src="/landing/img/feature-3.jpg"
                  className="img-fluid rounded w-100"
                  alt="Trusted Service"
                  style={{ display: 'block', width: '100%', height: 'auto' }}
                />
                <div className="feature-content p-4" style={{ position: 'absolute', width: '100%', height: '100%', bottom: 0, left: 0, background: 'rgba(0, 0, 0, 0.7)', borderRadius: '10px', zIndex: 2, display: 'flex', alignItems: 'flex-end' }}>
                  <div className="feature-content-inner" style={{ position: 'relative', zIndex: 5 }}>
                    <h4 className="text-white">Trusted Service</h4>
                    <p className="text-white">
                      Trusted by thousands of customers. Professional service and support throughout your journey.
                    </p>
                    <Link
                      href="/about"
                      className="btn btn-primary rounded-pill py-2 px-4"
                      style={{ color: 'white', textDecoration: 'none' }}
                    >
                      Read More <i className="fa fa-arrow-right ms-1"></i>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Feature End */}

      {/* About Start */}
      <div className="container-fluid about pb-5">
        <div className="container pb-5">
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

      {/* Service Start */}
      <div className="container-fluid service py-5">
        <div className="container service-section py-5">
          <div
            className="text-center mx-auto pb-5 wow fadeInUp"
            data-wow-delay="0.2s"
            style={{ maxWidth: '800px' }}
          >
            <h4 className="text-primary">Our Services</h4>
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

      {/* Blog Start */}
      <div className="container-fluid blog py-5">
        <div className="container py-5">
          <div
            className="text-center mx-auto pb-5 wow fadeInUp"
            data-wow-delay="0.2s"
            style={{ maxWidth: '800px' }}
          >
            <h4 className="text-primary">Our Blog</h4>
            <h1 className="display-5 mb-4">Latest News & Articles</h1>
            <p className="mb-0">
              Stay updated with the latest real estate news, tips, and market insights.
            </p>
          </div>
          <div className="row g-4">
            <div className="col-lg-4 wow fadeInUp" data-wow-delay="0.2s">
              <div className="blog-item">
                <div className="blog-img">
                  <Link href="/blog">
                    <Image
                      src="/landing/img/blog-2.jpg"
                      className="img-fluid w-100 rounded-top"
                      alt="Blog Post"
                      width={400}
                      height={250}
                    />
                  </Link>
                  <div className="blog-category py-2 px-4">Real Estate</div>
                  <div className="blog-date">
                    <i className="fas fa-clock me-2"></i>January 2025
                  </div>
                </div>
                <div className="blog-content p-4">
                  <Link href="/blog" className="h4 d-inline-block mb-4">
                    Tips for First-Time Home Buyers
                  </Link>
                  <p className="mb-4">
                    Essential tips and advice for first-time home buyers to make the right decision...
                  </p>
                  <Link href="/blog" className="btn btn-primary rounded-pill py-2 px-4">
                    Read More <i className="fas fa-arrow-right ms-2"></i>
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-lg-4 wow fadeInUp" data-wow-delay="0.4s">
              <div className="blog-item">
                <div className="blog-img">
                  <Link href="/blog">
                    <Image
                      src="/landing/img/blog-3.jpg"
                      className="img-fluid w-100 rounded-top"
                      alt="Blog Post"
                      width={400}
                      height={250}
                    />
                  </Link>
                  <div className="blog-category py-2 px-4">Market Insights</div>
                  <div className="blog-date">
                    <i className="fas fa-clock me-2"></i>January 2025
                  </div>
                </div>
                <div className="blog-content p-4">
                  <Link href="/blog" className="h4 d-inline-block mb-4">
                    Real Estate Market Trends 2025
                  </Link>
                  <p className="mb-4">
                    Explore the latest trends and predictions for the real estate market in 2025...
                  </p>
                  <Link href="/blog" className="btn btn-primary rounded-pill py-2 px-4">
                    Read More <i className="fas fa-arrow-right ms-2"></i>
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-lg-4 wow fadeInUp" data-wow-delay="0.6s">
              <div className="blog-item">
                <div className="blog-img">
                  <Link href="/blog">
                    <Image
                      src="/landing/img/blog-1.jpg"
                      className="img-fluid w-100 rounded-top"
                      alt="Blog Post"
                      width={400}
                      height={250}
                    />
                  </Link>
                  <div className="blog-category py-2 px-4">Investment</div>
                  <div className="blog-date">
                    <i className="fas fa-clock me-2"></i>January 2025
                  </div>
                </div>
                <div className="blog-content p-4">
                  <Link href="/blog" className="h4 d-inline-block mb-4">
                    Real Estate Investment Guide
                  </Link>
                  <p className="mb-4">
                    A comprehensive guide to real estate investment for beginners and experts...
                  </p>
                  <Link href="/blog" className="btn btn-primary rounded-pill py-2 px-4">
                    Read More <i className="fas fa-arrow-right ms-2"></i>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Blog End */}
    </>
  )
}

