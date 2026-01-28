'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export function Navbar() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    // Check if desktop on mount and resize
    const checkDesktop = () => {
      const desktop = window.innerWidth >= 992
      setIsDesktop(desktop)
      // Auto-close mobile menu when switching to desktop
      if (desktop) {
        setIsMobileMenuOpen(false)
      }
    }
    
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  const isActive = (path: string) => pathname === path
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <div className="container-fluid nav-bar sticky-top px-4 py-2 py-lg-0">
      <nav className="navbar navbar-expand-lg navbar-light" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <Link href="/" className="navbar-brand p-0">
          <h1 className="display-6 text-dark">
            <i className="fas fa-swimmer text-primary me-3"></i>Algomhoria
          </h1>
        </Link>
        
        {/* Mobile Menu Toggle Button */}
        <button
          className="navbar-toggler d-lg-none"
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle navigation"
          style={{
            border: '1px solid var(--bs-primary, #0d6efd)',
            padding: '8px 15px',
            color: 'var(--bs-primary, #0d6efd)',
            background: 'transparent',
            cursor: 'pointer',
            borderRadius: '4px'
          }}
        >
          <span className="fa fa-bars"></span>
        </button>
        
        {/* Navigation Menu - Always visible on desktop, toggleable on mobile */}
        <div 
          id="navbarCollapse"
          style={{
            display: isDesktop || isMobileMenuOpen ? 'flex' : 'none',
            flexDirection: isDesktop ? 'row' : 'column',
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'space-between',
            width: isDesktop ? 'auto' : '100%',
            gap: isDesktop ? '0' : '15px',
            marginLeft: isDesktop ? 'auto' : '0',
            padding: isDesktop ? '0' : '20px 0'
          }}
        >
          {/* Navigation Links */}
          <div 
            className="navbar-nav"
            style={{
              display: 'flex',
              flexDirection: isDesktop ? 'row' : 'column',
              alignItems: isDesktop ? 'center' : 'flex-start',
              margin: 0,
              padding: 0,
              listStyle: 'none',
              gap: 0
            }}
          >
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                padding: isDesktop ? '35px 25px' : '12px 0',
                color: isActive('/') ? 'var(--bs-primary, #0d6efd)' : 'var(--bs-dark, #212529)',
                textDecoration: 'none',
                fontSize: '17px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'color 0.5s',
                display: 'block'
              }}
              onMouseEnter={(e) => {
                if (!isActive('/')) {
                  e.currentTarget.style.color = 'var(--bs-primary, #0d6efd)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/')) {
                  e.currentTarget.style.color = 'var(--bs-dark, #212529)'
                }
              }}
            >
              Home
            </Link>
            <Link
              href="/about"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                padding: isDesktop ? '35px 25px' : '12px 0',
                color: isActive('/about') ? 'var(--bs-primary, #0d6efd)' : 'var(--bs-dark, #212529)',
                textDecoration: 'none',
                fontSize: '17px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'color 0.5s',
                display: 'block'
              }}
              onMouseEnter={(e) => {
                if (!isActive('/about')) {
                  e.currentTarget.style.color = 'var(--bs-primary, #0d6efd)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/about')) {
                  e.currentTarget.style.color = 'var(--bs-dark, #212529)'
                }
              }}
            >
              About
            </Link>
            <Link
              href="/service"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                padding: isDesktop ? '35px 25px' : '12px 0',
                color: isActive('/service') ? 'var(--bs-primary, #0d6efd)' : 'var(--bs-dark, #212529)',
                textDecoration: 'none',
                fontSize: '17px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'color 0.5s',
                display: 'block'
              }}
              onMouseEnter={(e) => {
                if (!isActive('/service')) {
                  e.currentTarget.style.color = 'var(--bs-primary, #0d6efd)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/service')) {
                  e.currentTarget.style.color = 'var(--bs-dark, #212529)'
                }
              }}
            >
              Service
            </Link>
            <div 
              style={{ position: 'relative' }}
              onMouseEnter={() => {
                if (isDesktop) setDropdownOpen(true)
              }}
              onMouseLeave={() => {
                if (isDesktop) setDropdownOpen(false)
              }}
            >
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (!isDesktop) {
                    setDropdownOpen(!dropdownOpen)
                  }
                }}
                style={{
                  padding: isDesktop ? '35px 25px' : '12px 0',
                  color: 'var(--bs-dark, #212529)',
                  textDecoration: 'none',
                  fontSize: '17px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'color 0.5s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--bs-primary, #0d6efd)'
                }}
                onMouseLeave={(e) => {
                  if (!dropdownOpen) {
                    e.currentTarget.style.color = 'var(--bs-dark, #212529)'
                  }
                }}
              >
                Pages
                <i className="fas fa-chevron-down" style={{ fontSize: '12px' }}></i>
              </a>
              {dropdownOpen && (
                <div 
                  style={{
                    position: isDesktop ? 'absolute' : 'static',
                    top: '100%',
                    left: 0,
                    background: 'var(--bs-light, #f8f9fa)',
                    borderRadius: '10px',
                    padding: '10px 0',
                    marginTop: '8px',
                    minWidth: '200px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    display: 'block'
                  }}
                >
                  <Link 
                    href="/blog" 
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      setDropdownOpen(false)
                    }}
                    style={{
                      display: 'block',
                      padding: '10px 20px',
                      color: 'var(--bs-dark, #212529)',
                      textDecoration: 'none',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bs-primary, #0d6efd)'
                      e.currentTarget.style.color = 'var(--bs-white, #fff)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--bs-dark, #212529)'
                    }}
                  >
                    Our Blog
                  </Link>
                  <Link 
                    href="/feature" 
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      setDropdownOpen(false)
                    }}
                    style={{
                      display: 'block',
                      padding: '10px 20px',
                      color: 'var(--bs-dark, #212529)',
                      textDecoration: 'none',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bs-primary, #0d6efd)'
                      e.currentTarget.style.color = 'var(--bs-white, #fff)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--bs-dark, #212529)'
                    }}
                  >
                    Our Feature
                  </Link>
                  <Link 
                    href="/team" 
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      setDropdownOpen(false)
                    }}
                    style={{
                      display: 'block',
                      padding: '10px 20px',
                      color: 'var(--bs-dark, #212529)',
                      textDecoration: 'none',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bs-primary, #0d6efd)'
                      e.currentTarget.style.color = 'var(--bs-white, #fff)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--bs-dark, #212529)'
                    }}
                  >
                    Our Team
                  </Link>
                </div>
              )}
            </div>
            <Link
              href="/contact"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                padding: isDesktop ? '35px 25px' : '12px 0',
                color: isActive('/contact') ? 'var(--bs-primary, #0d6efd)' : 'var(--bs-dark, #212529)',
                textDecoration: 'none',
                fontSize: '17px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'color 0.5s',
                display: 'block'
              }}
              onMouseEnter={(e) => {
                if (!isActive('/contact')) {
                  e.currentTarget.style.color = 'var(--bs-primary, #0d6efd)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive('/contact')) {
                  e.currentTarget.style.color = 'var(--bs-dark, #212529)'
                }
              }}
            >
              Contact
            </Link>
          </div>
          
          {/* Social Icons & Admin Button */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginLeft: isDesktop ? '20px' : '0',
              flexDirection: isDesktop ? 'row' : 'column',
              width: isDesktop ? 'auto' : '100%'
            }}
          >
            {/* Social Icons - Hidden on mobile, visible on desktop */}
            {isDesktop && (
              <div style={{ display: 'flex', gap: '8px', marginRight: '15px' }}>
                <a
                  href="https://www.facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--bs-light, #f8f9fa)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--bs-primary, #0d6efd)',
                    textDecoration: 'none',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bs-primary, #0d6efd)'
                    e.currentTarget.style.color = 'var(--bs-white, #fff)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bs-light, #f8f9fa)'
                    e.currentTarget.style.color = 'var(--bs-primary, #0d6efd)'
                  }}
                >
                  <i className="fab fa-facebook-f"></i>
                </a>
                <a
                  href="https://www.twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--bs-light, #f8f9fa)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--bs-primary, #0d6efd)',
                    textDecoration: 'none',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bs-primary, #0d6efd)'
                    e.currentTarget.style.color = 'var(--bs-white, #fff)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bs-light, #f8f9fa)'
                    e.currentTarget.style.color = 'var(--bs-primary, #0d6efd)'
                  }}
                >
                  <i className="fab fa-twitter"></i>
                </a>
                <a
                  href="https://www.instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--bs-light, #f8f9fa)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--bs-primary, #0d6efd)',
                    textDecoration: 'none',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bs-primary, #0d6efd)'
                    e.currentTarget.style.color = 'var(--bs-white, #fff)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bs-light, #f8f9fa)'
                    e.currentTarget.style.color = 'var(--bs-primary, #0d6efd)'
                  }}
                >
                  <i className="fab fa-instagram"></i>
                </a>
                <a
                  href="https://www.linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--bs-light, #f8f9fa)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--bs-primary, #0d6efd)',
                    textDecoration: 'none',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bs-primary, #0d6efd)'
                    e.currentTarget.style.color = 'var(--bs-white, #fff)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bs-light, #f8f9fa)'
                    e.currentTarget.style.color = 'var(--bs-primary, #0d6efd)'
                  }}
                >
                  <i className="fab fa-linkedin-in"></i>
                </a>
              </div>
            )}
            
            {/* Admin Login Button */}
            <Link
              href="/admin"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                padding: '8px 20px',
                borderRadius: '50px',
                background: 'var(--bs-primary, #0d6efd)',
                color: 'var(--bs-white, #fff)',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                transition: 'all 0.3s',
                display: 'inline-block',
                width: isDesktop ? 'auto' : '100%',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              Admin Login
            </Link>
          </div>
        </div>
      </nav>
    </div>
  )
}
