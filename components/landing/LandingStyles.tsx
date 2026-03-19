'use client'

import { useEffect } from 'react'

export function LandingStyles() {
  useEffect(() => {
    // Function to check if link already exists
    const linkExists = (href: string) => {
      return document.querySelector(`link[href="${href}"]`) !== null
    }

    // Function to add link if it doesn't exist - returns the link element
    const addLink = (rel: string, href: string, attributes?: Record<string, string>): HTMLLinkElement | null => {
      if (!linkExists(href)) {
        try {
          const link = document.createElement('link')
          link.rel = rel
          link.href = href
          if (attributes) {
            Object.entries(attributes).forEach(([key, value]) => {
              link.setAttribute(key, value)
            })
          }
          // Insert at the beginning of head for critical CSS
          if (rel === 'stylesheet' && href.includes('bootstrap')) {
            document.head.insertBefore(link, document.head.firstChild)
          } else {
            document.head.appendChild(link)
          }
          return link
        } catch (error) {
          console.error(`Failed to load: ${href}`, error)
          return null
        }
      }
      return document.querySelector(`link[href="${href}"]`) as HTMLLinkElement
    }

    // Add preconnect links first
    addLink('preconnect', 'https://fonts.googleapis.com')
    addLink('preconnect', 'https://fonts.gstatic.com', { crossOrigin: 'anonymous' })
    addLink('preconnect', 'https://cdnjs.cloudflare.com')
    addLink('preconnect', 'https://cdn.jsdelivr.net')

    // CRITICAL: Bootstrap CSS must load first (insert at beginning)
    addLink('stylesheet', '/landing/css/bootstrap.min.css')
    
    // Template CSS (loads after Bootstrap)
    addLink('stylesheet', '/landing/css/style.css')
    
    // Library styles
    addLink('stylesheet', '/landing/lib/animate/animate.min.css')
    addLink('stylesheet', '/landing/lib/lightbox/css/lightbox.min.css')
    addLink('stylesheet', '/landing/lib/owlcarousel/assets/owl.carousel.min.css')
    
    // External fonts and icons
    addLink('stylesheet', 'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&family=Open+Sans:ital,wdth,wght@0,75..100,300..800;1,75..100,300..800&display=swap')
    
    // Font Awesome - use reliable CDN
    addLink('stylesheet', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css', {
      integrity: 'sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==',
      crossOrigin: 'anonymous',
      referrerPolicy: 'no-referrer'
    })
    
    addLink('stylesheet', 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.4.1/font/bootstrap-icons.css')
    
  }, [])

  return null
}

