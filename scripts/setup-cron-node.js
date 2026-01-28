/**
 * Node.js cron setup using node-cron
 * This creates a background process that runs the check on a schedule
 * 
 * Usage:
 *   npm install node-cron
 *   node scripts/setup-cron-node.js
 * 
 * Or with PM2:
 *   pm2 start scripts/setup-cron-node.js --name "rental-expiry-checker"
 *   pm2 save
 */

require('dotenv').config({ path: '.env.local' })

const cron = require('node-cron')
const { checkExpiredRentals } = require('./check-expired-rentals')

// Schedule: Daily at midnight (00:00)
// Format: minute hour day month weekday
// Examples:
//   "0 0 * * *"   - Daily at midnight
//   "0 22 * * *"  - Daily at 10 PM (midnight Cairo time, UTC+2)
//   "0 */6 * * *" - Every 6 hours
//   "0 0 * * 0"   - Weekly on Sunday at midnight

const SCHEDULE = process.env.RENTAL_CHECK_SCHEDULE || "0 0 * * *"

console.log('🚀 Starting rental expiry checker...')
console.log(`📅 Schedule: ${SCHEDULE}`)
console.log(`⏰ Next run: ${getNextRunTime(SCHEDULE)}`)
console.log('')

// Schedule the task
const task = cron.schedule(SCHEDULE, async () => {
  console.log(`\n⏰ Running scheduled check at ${new Date().toISOString()}\n`)
  try {
    await checkExpiredRentals()
  } catch (error) {
    console.error(`❌ Scheduled check failed: ${error.message}`)
  }
}, {
  scheduled: true,
  timezone: "UTC"
})

// Run immediately on startup (optional - remove if you don't want this)
if (process.env.RUN_ON_STARTUP === 'true') {
  console.log('🔄 Running initial check on startup...\n')
  checkExpiredRentals().catch(error => {
    console.error(`❌ Initial check failed: ${error.message}`)
  })
}

// Keep the process alive
console.log('✅ Cron job is running. Press Ctrl+C to stop.')
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping cron job...')
  task.stop()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping cron job...')
  task.stop()
  process.exit(0)
})

/**
 * Calculate next run time (approximate)
 */
function getNextRunTime(schedule) {
  const now = new Date()
  const [minute, hour] = schedule.split(' ').slice(0, 2)
  
  let nextRun = new Date()
  nextRun.setUTCHours(parseInt(hour) || 0, parseInt(minute) || 0, 0, 0)
  
  // If time has passed today, schedule for tomorrow
  if (nextRun <= now) {
    nextRun.setUTCDate(nextRun.getUTCDate() + 1)
  }
  
  return nextRun.toISOString()
}

