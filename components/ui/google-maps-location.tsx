'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface GoogleMapsLocationProps {
  locationText: string
  latitude: number | null | undefined
  longitude: number | null | undefined
  onLocationChange: (locationText: string, lat: number | null, lng: number | null) => void
  disabled?: boolean
}

declare global {
  interface Window {
    google: any
    googleMapsLoaded?: boolean
  }
}

export function GoogleMapsLocation({
  locationText,
  latitude,
  longitude,
  onLocationChange,
  disabled = false,
}: GoogleMapsLocationProps) {
  const [isLoaded, setIsLoaded] = React.useState(false)
  const [autocomplete, setAutocomplete] = React.useState<any>(null)
  const [map, setMap] = React.useState<any>(null)
  const [marker, setMarker] = React.useState<any>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const mapRef = React.useRef<HTMLDivElement>(null)

  // Load Google Maps API - using a global flag to prevent multiple loads
  React.useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true)
      return
    }

    // Get API key from environment
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    
    if (!apiKey) {
      console.warn('Google Maps API key not found. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env.local file')
      setIsLoaded(false)
      return
    }

    // Check if script is already in the DOM or already loaded
    const existingScript = document.querySelector(`script#google-maps-script`)
    if (existingScript) {
      // Script exists, check if it's loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        setIsLoaded(true)
      } else {
        // Wait for the existing script to load
        const checkLoaded = setInterval(() => {
          if (window.google && window.google.maps && window.google.maps.places) {
            setIsLoaded(true)
            clearInterval(checkLoaded)
          }
        }, 100)

        // Cleanup interval after 10 seconds
        setTimeout(() => clearInterval(checkLoaded), 10000)
      }
      return
    }

    // Also check for any Google Maps script (in case it was loaded without our ID)
    const anyGoogleScript = document.querySelector(`script[src*="maps.googleapis.com"]`)
    if (anyGoogleScript) {
      // Script exists but might not have our ID, check if loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        setIsLoaded(true)
      }
      return
    }

    // Create a unique callback name to avoid conflicts
    const callbackName = `initGoogleMaps_${Date.now()}`
    
    // Set up the callback with error handling
    ;(window as any)[callbackName] = () => {
      try {
        if (window.google && window.google.maps && window.google.maps.places) {
          setIsLoaded(true)
        } else {
          console.warn('Google Maps loaded but places library not available')
          setIsLoaded(false)
        }
      } catch (error) {
        console.error('Error in Google Maps callback:', error)
        setIsLoaded(false)
      } finally {
        // Clean up the callback after a delay to ensure it's called
        setTimeout(() => {
          try {
            delete (window as any)[callbackName]
          } catch (e) {
            // Ignore cleanup errors
          }
        }, 1000)
      }
    }

    // Load Google Maps script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`
    script.async = true
    script.defer = true
    script.id = 'google-maps-script'

    script.onerror = () => {
      console.error('Failed to load Google Maps script')
      setIsLoaded(false)
      try {
        delete (window as any)[callbackName]
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    // Add timeout fallback in case callback never fires
    const timeoutId = setTimeout(() => {
      if (!window.google || !window.google.maps) {
        console.warn('Google Maps callback timeout - checking if loaded anyway')
        if (window.google && window.google.maps && window.google.maps.places) {
          setIsLoaded(true)
        }
      }
      try {
        delete (window as any)[callbackName]
      } catch (e) {
        // Ignore cleanup errors
      }
    }, 10000) // 10 second timeout

    script.onload = () => {
      clearTimeout(timeoutId)
    }

    document.head.appendChild(script)

    return () => {
      clearTimeout(timeoutId)
      try {
        delete (window as any)[callbackName]
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    // No cleanup needed - we want to keep the script loaded for the entire app session
  }, [])

  // Initialize autocomplete
  React.useEffect(() => {
    if (!isLoaded || !inputRef.current || !window.google || !window.google.maps || !window.google.maps.places) return

    // Suppress deprecation warnings - they're just warnings, not errors
    const originalWarn = console.warn
    let autocompleteInstance: any = null

    try {
      // Temporarily suppress deprecation warnings during initialization
      console.warn = (...args: any[]) => {
        // Suppress Google Maps deprecation warnings
        if (args[0] && typeof args[0] === 'string' && args[0].includes('google.maps.places.Autocomplete')) {
          return // Suppress this warning
        }
        originalWarn.apply(console, args)
      }

      autocompleteInstance = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'eg' }, // Restrict to Egypt, remove if you want worldwide
      })
      
      // Restore console.warn after successful initialization
      console.warn = originalWarn

      autocompleteInstance.addListener('place_changed', () => {
        try {
          const place = autocompleteInstance.getPlace()
          
          if (place.geometry) {
            const lat = place.geometry.location.lat()
            const lng = place.geometry.location.lng()
            const address = place.formatted_address || place.name || locationText

            onLocationChange(address, lat, lng)

            // Update map
            if (map) {
              const location = new window.google.maps.LatLng(lat, lng)
              map.setCenter(location)
              map.setZoom(15)

              if (marker) {
                marker.setPosition(location)
              } else {
                const newMarker = new window.google.maps.Marker({
                  position: location,
                  map: map,
                  draggable: true,
                })

                newMarker.addListener('dragend', (e: any) => {
                  try {
                    const newLat = e.latLng.lat()
                    const newLng = e.latLng.lng()
                    onLocationChange(locationText, newLat, newLng)
                  } catch (error) {
                    console.error('Error in marker dragend:', error)
                  }
                })

                setMarker(newMarker)
              }
            }
          }
        } catch (error) {
          console.error('Error in place_changed handler:', error)
          // Don't block the form - allow it to continue
        }
      })

      setAutocomplete(autocompleteInstance)
    } catch (error) {
      // Restore console.warn if error occurred
      console.warn = originalWarn
      // Silently handle autocomplete errors - don't block the form
      // The form can still work without autocomplete
      autocompleteInstance = null
    }

    // Return cleanup function outside of try-catch
    return () => {
      try {
        if (autocompleteInstance && window.google && window.google.maps && window.google.maps.event) {
          window.google.maps.event.clearInstanceListeners(autocompleteInstance)
        }
      } catch (error) {
        // Silently handle cleanup errors - don't block form
      }
    }
  }, [isLoaded, map, locationText, onLocationChange])

  // Initialize map
  React.useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google) return

    const defaultLat = latitude || 30.0444 // Cairo default
    const defaultLng = longitude || 31.2357

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      center: { lat: defaultLat, lng: defaultLng },
      zoom: latitude && longitude ? 15 : 10,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
    })

    // Add click listener to map
    mapInstance.addListener('click', (e: any) => {
      const lat = e.latLng.lat()
      const lng = e.latLng.lng()
      
      // Reverse geocode to get address
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
        if (status === 'OK' && results[0]) {
          onLocationChange(results[0].formatted_address, lat, lng)
        } else if (status === 'REQUEST_DENIED' || status === 'ZERO_RESULTS') {
          // If geocoding fails, just use coordinates
          onLocationChange(locationText || `${lat}, ${lng}`, lat, lng)
          console.warn('Geocoding API not enabled or no results. Please enable Geocoding API in Google Cloud Console.')
        } else {
          onLocationChange(locationText || `${lat}, ${lng}`, lat, lng)
        }
      })

      // Update marker
      if (marker) {
        marker.setPosition({ lat, lng })
      } else {
        const newMarker = new window.google.maps.Marker({
          position: { lat, lng },
          map: mapInstance,
          draggable: true,
        })

        newMarker.addListener('dragend', (e: any) => {
          const newLat = e.latLng.lat()
          const newLng = e.latLng.lng()
          const geocoder = new window.google.maps.Geocoder()
          geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results: any, status: string) => {
            if (status === 'OK' && results[0]) {
              onLocationChange(results[0].formatted_address, newLat, newLng)
            } else if (status === 'REQUEST_DENIED' || status === 'ZERO_RESULTS') {
              onLocationChange(locationText || `${newLat}, ${newLng}`, newLat, newLng)
              console.warn('Geocoding API not enabled or no results. Please enable Geocoding API in Google Cloud Console.')
            } else {
              onLocationChange(locationText || `${newLat}, ${newLng}`, newLat, newLng)
            }
          })
        })

        setMarker(newMarker)
      }
    })

    // Add marker if lat/lng exist
    if (latitude && longitude) {
      const markerInstance = new window.google.maps.Marker({
        position: { lat: latitude, lng: longitude },
        map: mapInstance,
        draggable: true,
      })

      markerInstance.addListener('dragend', (e: any) => {
        const newLat = e.latLng.lat()
        const newLng = e.latLng.lng()
        const geocoder = new window.google.maps.Geocoder()
        geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results: any, status: string) => {
          if (status === 'OK' && results[0]) {
            onLocationChange(results[0].formatted_address, newLat, newLng)
          } else if (status === 'REQUEST_DENIED' || status === 'ZERO_RESULTS') {
            onLocationChange(locationText || `${newLat}, ${newLng}`, newLat, newLng)
            console.warn('Geocoding API not enabled or no results. Please enable Geocoding API in Google Cloud Console.')
          } else {
            onLocationChange(locationText || `${newLat}, ${newLng}`, newLat, newLng)
          }
        })
      })

      setMarker(markerInstance)
    }

    setMap(mapInstance)

    return () => {
      if (marker) {
        marker.setMap(null)
      }
    }
  }, [isLoaded, latitude, longitude])

  // Update map when lat/lng changes externally
  React.useEffect(() => {
    if (!map || !latitude || !longitude) return

    const location = new window.google.maps.LatLng(latitude, longitude)
    map.setCenter(location)
    map.setZoom(15)

    if (marker) {
      marker.setPosition(location)
    } else {
      const newMarker = new window.google.maps.Marker({
        position: location,
        map: map,
        draggable: true,
      })

      newMarker.addListener('dragend', (e: any) => {
        const newLat = e.latLng.lat()
        const newLng = e.latLng.lng()
        const geocoder = new window.google.maps.Geocoder()
        geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results: any, status: string) => {
          if (status === 'OK' && results[0]) {
            onLocationChange(results[0].formatted_address, newLat, newLng)
          } else if (status === 'REQUEST_DENIED' || status === 'ZERO_RESULTS') {
            onLocationChange(locationText || `${newLat}, ${newLng}`, newLat, newLng)
            console.warn('Geocoding API not enabled or no results. Please enable Geocoding API in Google Cloud Console.')
          } else {
            onLocationChange(locationText || `${newLat}, ${newLng}`, newLat, newLng)
          }
        })
      })

      setMarker(newMarker)
    }
  }, [latitude, longitude, map, locationText, onLocationChange])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="location_text">Location (with Google Maps Autocomplete)</Label>
        <Input
          ref={inputRef}
          id="location_text"
          type="text"
          value={locationText}
          onChange={(e) => {
            // Allow manual typing
            onLocationChange(e.target.value, latitude || null, longitude || null)
          }}
          onKeyDown={(e) => {
            // Don't interfere with form submission
            // If Enter is pressed, check if autocomplete dropdown is visible
            if (e.key === 'Enter') {
              const pacContainer = document.querySelector('.pac-container') as HTMLElement
              // Only prevent default if dropdown is visible and has suggestions
              if (pacContainer && pacContainer.style.display !== 'none') {
                const pacItems = pacContainer.querySelectorAll('.pac-item')
                if (pacItems.length > 0) {
                  // Dropdown is open with suggestions, let autocomplete handle it
                  return
                }
              }
              // No dropdown or no suggestions, allow form to submit normally
              // Don't prevent default - let the form handle Enter key
            }
          }}
          placeholder="Type or select a location..."
          disabled={disabled}
          autoComplete="off"
        />
        {!isLoaded && (
          <p className="text-xs text-muted-foreground">
            Loading Google Maps... {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && '(API key not configured)'}
          </p>
        )}
        {isLoaded && (
          <p className="text-xs text-muted-foreground">
            💡 Tip: Make sure to enable <strong>Geocoding API</strong> in Google Cloud Console for reverse geocoding (coordinates to address)
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Map Preview</Label>
        <div
          ref={mapRef}
          className="w-full h-[400px] rounded-md border border-input bg-muted"
          style={{ minHeight: '400px' }}
        />
        <p className="text-xs text-muted-foreground">
          Click on the map to set location, or drag the marker to adjust
        </p>
      </div>

      {(latitude || longitude) && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="latitude_display">Latitude (Auto-filled)</Label>
            <Input
              id="latitude_display"
              type="text"
              value={latitude?.toFixed(8) || ''}
              readOnly
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude_display">Longitude (Auto-filled)</Label>
            <Input
              id="longitude_display"
              type="text"
              value={longitude?.toFixed(8) || ''}
              readOnly
              className="bg-muted"
            />
          </div>
        </div>
      )}
    </div>
  )
}

