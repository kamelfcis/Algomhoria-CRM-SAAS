/**
 * Standalone script to check and update expired rentals
 * Can be run manually or via external cron service
 * 
 * Usage:
 *   node scripts/check-expired-rentals.js
 * 
 * Or with environment variables:
 *   SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/check-expired-rentals.js
 */

require('dotenv').config({ path: '.env.local' })

const https = require('https')
const http = require('http')

// Get configuration from environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing required environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
  console.error('Make sure .env.local file exists with these variables')
  process.exit(1)
}

/**
 * Call the API endpoint to check expired rentals
 */
async function checkExpiredRentals() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_URL}/api/properties/check-expired-rentals`)
    const isHttps = url.protocol === 'https:'
    const client = isHttps ? https : http

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      timeout: 30000 // 30 seconds timeout
    }

    console.log(`🔄 Checking expired rentals...`)
    console.log(`📍 URL: ${url.toString()}`)

    const req = client.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          
          if (res.statusCode === 200 && response.success) {
            console.log(`✅ Success: ${response.message}`)
            console.log(`📊 Updated ${response.updatedCount} property/properties`)
            if (response.propertyIds && response.propertyIds.length > 0) {
              console.log(`🆔 Property IDs: ${response.propertyIds.join(', ')}`)
            }
            resolve(response)
          } else {
            console.error(`❌ Error: ${response.error || 'Unknown error'}`)
            if (response.details) {
              console.error(`Details: ${response.details}`)
            }
            reject(new Error(response.error || 'Unknown error'))
          }
        } catch (error) {
          console.error(`❌ Error parsing response: ${error.message}`)
          console.error(`Response: ${data}`)
          reject(error)
        }
      })
    })

    req.on('error', (error) => {
      console.error(`❌ Request error: ${error.message}`)
      reject(error)
    })

    req.on('timeout', () => {
      req.destroy()
      console.error(`❌ Request timeout`)
      reject(new Error('Request timeout'))
    })

    req.write(JSON.stringify({}))
    req.end()
  })
}

/**
 * Main execution
 */
async function main() {
  try {
    const startTime = new Date()
    console.log(`\n🚀 Starting expired rentals check at ${startTime.toISOString()}\n`)
    
    await checkExpiredRentals()
    
    const endTime = new Date()
    const duration = (endTime - startTime) / 1000
    console.log(`\n✨ Completed in ${duration.toFixed(2)} seconds`)
    console.log(`⏰ Finished at ${endTime.toISOString()}\n`)
    
    process.exit(0)
  } catch (error) {
    console.error(`\n💥 Fatal error: ${error.message}\n`)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

module.exports = { checkExpiredRentals }

