'use client'

import { useEffect } from 'react'

export function LandingHead() {
  useEffect(() => {
    // Ensure CSS loads immediately on mount
    const loadCriticalCSS = () => {
      const head = document.head
      
      // Bootstrap CSS (critical - must load first)
      if (!document.querySelector('link[href="/landing/css/bootstrap.min.css"]')) {
        const bootstrapLink = document.createElement('link')
        bootstrapLink.rel = 'stylesheet'
        bootstrapLink.href = '/landing/css/bootstrap.min.css'
        head.insertBefore(bootstrapLink, head.firstChild)
      }
      
      // Template CSS (critical)
      if (!document.querySelector('link[href="/landing/css/style.css"]')) {
        const styleLink = document.createElement('link')
        styleLink.rel = 'stylesheet'
        styleLink.href = '/landing/css/style.css'
        head.appendChild(styleLink)
      }
    }
    
    // Load immediately
    loadCriticalCSS()
    
    // Also try on next tick
    setTimeout(loadCriticalCSS, 0)
  }, [])
  
  return null
}

