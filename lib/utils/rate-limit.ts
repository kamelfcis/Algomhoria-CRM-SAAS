import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory rate limiter
// For production with multiple instances, consider using Redis (e.g., @upstash/ratelimit)

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory store (clears on server restart)
// For production, replace with Redis or similar
const rateLimitStore: RateLimitStore = {}

// Clean up old entries periodically (only in Node.js environment)
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  // Use setInterval only in server environment
  if (typeof setInterval !== 'undefined') {
    setInterval(() => {
      const now = Date.now()
      Object.keys(rateLimitStore).forEach(key => {
        if (rateLimitStore[key].resetTime < now) {
          delete rateLimitStore[key]
        }
      })
    }, 60000) // Clean up every minute
  }
}

export interface RateLimitOptions {
  limit: number // Maximum number of requests
  window: number // Time window in milliseconds
  identifier?: string // Custom identifier (defaults to IP address)
}

/**
 * Simple rate limiter middleware
 * @param request - Next.js request object
 * @param options - Rate limit configuration
 * @returns Response with rate limit headers or null if within limit
 */
export function rateLimit(
  request: NextRequest,
  options: RateLimitOptions
): NextResponse | null {
  const { limit, window, identifier } = options

  // Get identifier (IP address or custom)
  const id = identifier || getClientIdentifier(request)

  const now = Date.now()
  const record = rateLimitStore[id]

  if (!record || record.resetTime < now) {
    // Create new record or reset expired one
    rateLimitStore[id] = {
      count: 1,
      resetTime: now + window,
    }
    return null // Within limit
  }

  if (record.count >= limit) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((record.resetTime - now) / 1000)
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
        },
      }
    )
  }

  // Increment count
  record.count++
  const remaining = Math.max(0, limit - record.count)

  // Return null to continue, but set rate limit headers
  // Note: We can't set headers here, so we'll handle this in the route handler
  return null
}

/**
 * Get client identifier (IP address)
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || request.ip || 'unknown'

  return ip
}

/**
 * Rate limit configuration presets
 */
export const rateLimitPresets = {
  // Strict: 10 requests per minute
  strict: { limit: 10, window: 60 * 1000 },
  // Default: 60 requests per minute
  default: { limit: 60, window: 60 * 1000 },
  // Moderate: 100 requests per minute
  moderate: { limit: 100, window: 60 * 1000 },
  // Lenient: 200 requests per minute
  lenient: { limit: 200, window: 60 * 1000 },
  // Per user: 100 requests per minute (requires user ID)
  perUser: { limit: 100, window: 60 * 1000 },
}

/**
 * Helper to create rate limit response with headers
 */
export function createRateLimitResponse(
  limit: number,
  remaining: number,
  resetTime: number
): Headers {
  const headers = new Headers()
  headers.set('X-RateLimit-Limit', limit.toString())
  headers.set('X-RateLimit-Remaining', remaining.toString())
  headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString())
  return headers
}

