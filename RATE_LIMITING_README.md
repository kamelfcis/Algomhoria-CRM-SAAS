# Rate Limiting Implementation

## Overview
Rate limiting has been implemented to protect API routes from abuse and ensure fair resource usage across all users.

## Implementation

### Rate Limiting Utility
**File**: `lib/utils/rate-limit.ts`

A simple in-memory rate limiter that tracks requests per IP address (or custom identifier) within a time window.

### Features
- **In-memory storage**: Fast and simple (clears on server restart)
- **Automatic cleanup**: Old entries are cleaned up every minute
- **Configurable limits**: Different limits for different operations
- **Rate limit headers**: Standard HTTP headers for client information
- **IP-based tracking**: Uses IP address or custom identifier

### Rate Limit Presets

| Preset | Limit | Window | Use Case |
|--------|-------|--------|----------|
| `strict` | 10 requests | 1 minute | Delete operations, password changes, system operations |
| `default` | 60 requests | 1 minute | Standard write operations (POST, PATCH) |
| `moderate` | 100 requests | 1 minute | Read operations (GET) |
| `lenient` | 200 requests | 1 minute | High-frequency read operations |
| `perUser` | 100 requests | 1 minute | Per-user rate limiting (requires user ID) |

## Applied Routes

### Users API (`/api/users`)
- **POST** (Create user): `default` (60/min)
- **PATCH** (Update user): `default` (60/min)
- **DELETE** (Delete user): `strict` (10/min)

### User Password API (`/api/users/[id]/password`)
- **PATCH** (Change password): `strict` (10/min)

### Role Permissions API (`/api/role-permissions`)
- **GET** (Read permissions): `moderate` (100/min)
- **POST** (Assign permissions): `default` (60/min)
- **DELETE** (Remove permissions): `strict` (10/min)

### Check Expired Rentals API (`/api/properties/check-expired-rentals`)
- **POST** (Manual trigger): `strict` (10/min)
- **Note**: Cron jobs with service role key bypass rate limiting

## Rate Limit Headers

When a request is made, the following headers are included in the response:

- `X-RateLimit-Limit`: Maximum number of requests allowed
- `X-RateLimit-Remaining`: Number of requests remaining in the current window
- `X-RateLimit-Reset`: ISO timestamp when the rate limit resets
- `Retry-After`: Seconds to wait before retrying (only when rate limited)

## Rate Limit Response

When rate limit is exceeded, the API returns:

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again in 45 seconds.",
  "retryAfter": 45
}
```

**Status Code**: `429 Too Many Requests`

## Usage Example

```typescript
import { rateLimit, rateLimitPresets } from '@/lib/utils/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = rateLimit(request, rateLimitPresets.default)
  if (rateLimitResponse) {
    return rateLimitResponse // Rate limit exceeded
  }

  // Continue with your handler logic
  // ...
}
```

## Custom Rate Limits

You can create custom rate limits:

```typescript
const customLimit = rateLimit(request, {
  limit: 50,        // 50 requests
  window: 60000,   // per 60 seconds (1 minute)
  identifier: userId // Optional: use user ID instead of IP
})
```

## Production Considerations

### Current Implementation (In-Memory)
- ✅ Simple and fast
- ✅ No external dependencies
- ❌ Doesn't work across multiple server instances
- ❌ Clears on server restart

### Recommended for Production (Redis-based)
For production with multiple server instances, consider using Redis:

1. **Install dependency**:
   ```bash
   npm install @upstash/ratelimit @upstash/redis
   ```

2. **Update rate-limit.ts** to use Redis:
   ```typescript
   import { Ratelimit } from '@upstash/ratelimit'
   import { Redis } from '@upstash/redis'
   
   const ratelimit = new Ratelimit({
     redis: Redis.fromEnv(),
     limiter: Ratelimit.slidingWindow(60, '1 m'),
   })
   ```

3. **Benefits**:
   - Works across multiple server instances
   - Persistent across server restarts
   - More accurate rate limiting
   - Better for distributed systems

## Monitoring

To monitor rate limiting:
1. Check response headers for rate limit information
2. Monitor 429 status codes in your analytics
3. Log rate limit violations for security analysis

## Configuration

Rate limits can be adjusted in `lib/utils/rate-limit.ts`:

```typescript
export const rateLimitPresets = {
  strict: { limit: 10, window: 60 * 1000 },    // Adjust as needed
  default: { limit: 60, window: 60 * 1000 },    // Adjust as needed
  moderate: { limit: 100, window: 60 * 1000 },  // Adjust as needed
  // ...
}
```

## Testing

To test rate limiting:
1. Make rapid requests to an API endpoint
2. Check for 429 status code after exceeding the limit
3. Verify `Retry-After` header indicates correct wait time
4. Confirm requests work again after the window expires

## Security Notes

- Rate limiting helps prevent:
  - Brute force attacks
  - DDoS attacks
  - Resource exhaustion
  - API abuse

- For sensitive operations (password changes, deletions), stricter limits are applied
- Service role keys can bypass rate limiting for automated tasks (cron jobs)

