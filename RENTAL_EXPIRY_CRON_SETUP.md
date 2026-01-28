# Rental Expiry Cron Job Setup

This guide explains how to set up an automated job to check and update expired rentals.

## Overview

When a property is marked as "Is Rented" (`is_rented = true`), you can set a `rental_end_date`. The system will automatically set `is_rented = false` when this date passes.

## Database Setup

1. **Run the SQL migration**:
   - Execute `add_rental_end_date.sql` in your Supabase SQL Editor
   - This creates:
     - `rental_end_date` column in the `properties` table
     - `update_expired_rentals()` function to check and update expired rentals
     - Index for performance

## API Endpoint

The API endpoint `/api/properties/check-expired-rentals` is available to trigger the check manually or via cron job.

**Endpoint**: `POST /api/properties/check-expired-rentals`

**Authentication**: Required (user must be logged in)

**Response**:
```json
{
  "success": true,
  "updatedCount": 5,
  "propertyIds": ["uuid1", "uuid2", ...],
  "message": "Successfully updated 5 expired rental(s)"
}
```

## Setting Up Cron Job

### ✅ Option 1: Using Supabase CLI Schedule (GUARANTEED WORKING - 2025 Method)

**Important**: Many Supabase projects don't have "Scheduled Functions" or "Cron Jobs" in the dashboard. The CLI method works for ALL projects regardless of plan or region.

1. **Edge Function is Already Created**:
   - The Edge Function code is in `supabase/functions/check-expired-rentals/index.ts`
   - It calls the `update_expired_rentals()` database function

2. **Configure Schedule in `supabase/config.toml`**:
   
   The schedule is already configured in `supabase/config.toml`:
   ```toml
   [functions.check-expired-rentals]
   schedule = "0 22 * * *"  # Daily at 10 PM UTC (midnight Cairo time, UTC+2)
   ```
   
   **Common Schedule Options**:
   - `"0 0 * * *"` - Daily at midnight UTC
   - `"0 22 * * *"` - Daily at 10 PM UTC (midnight Cairo time, UTC+2) - **Current setting**
   - `"0 2 * * *"` - Daily at 2 AM UTC
   - `"0 */6 * * *"` - Every 6 hours
   - `"0 0 * * 0"` - Weekly on Sunday at midnight
   
   Edit `supabase/config.toml` to change the schedule if needed.

3. **Install and Setup Supabase CLI** (if not already done):
   ```bash
   # Install Supabase CLI globally
   npm install -g supabase
   
   # Or using other package managers:
   # brew install supabase/tap/supabase  # macOS
   # scoop bucket add supabase https://github.com/supabase/scoop-bucket.git  # Windows
   # scoop install supabase
   ```

4. **Login and Link Your Project**:
   ```bash
   # Login to Supabase
   supabase login
   
   # Link to your project
   # Get your project ref from dashboard URL: https://supabase.com/dashboard/project/YOUR_PROJECT_REF
   supabase link --project-ref your-project-ref
   ```

5. **Deploy the Function with Schedule**:
   ```bash
   # Deploy the function (schedule is read from config.toml)
   supabase functions deploy check-expired-rentals
   ```

6. **Verify Schedule is Active**:
   ```bash
   # List all functions and their schedules
   supabase functions list
   ```
   
   You should see:
   ```
   check-expired-rentals    scheduled: 0 22 * * *
   ```
   
   ✅ **If you see "scheduled: ..." it means it's LIVE and working!**

7. **Check Logs**:
   - Go to Supabase Dashboard → **Edge Functions** → **check-expired-rentals** → **Logs**
   - You'll see daily executions after the scheduled time
   - Or use CLI: `supabase functions logs check-expired-rentals`

### Option 2: Using Supabase Dashboard (If Available)

**Note**: This option is only available if your project has "Scheduled Functions" in the dashboard. Many projects don't have this feature.

1. **Deploy Edge Function via Dashboard**:
   - Go to Supabase Dashboard → Edge Functions
   - Click "Create a new function"
   - Name: `check-expired-rentals`
   - Copy the code from `supabase/functions/check-expired-rentals/index.ts`
   - Click "Deploy"

2. **Set up Scheduled Function** (if available):
   - Go to Supabase Dashboard → Database → Scheduled Functions
   - If you see this option, click "Create a new scheduled function"
   - Select `check-expired-rentals`
   - Set schedule (e.g., `0 22 * * *`)
   - Enable and save

**If you don't see "Scheduled Functions" in your dashboard, use Option 1 (CLI method) instead.**

4. **Verify Scheduled Function**:
   - Go to Supabase Dashboard → Database → Scheduled Functions
   - You should see `check-expired-rentals` listed
   - Check the "Last Run" timestamp to verify it's executing
   - View logs in Edge Functions → check-expired-rentals → Logs

### Option 2: Using External Cron Service (Alternative)

If you prefer not to use Supabase Scheduled Functions, you can use an external cron service:

1. **Get your API endpoint URL**:
   - Production: `https://your-domain.com/api/properties/check-expired-rentals`
   - Development: `http://localhost:3000/api/properties/check-expired-rentals`

2. **Set up cron job**:
   - **URL**: Your API endpoint
   - **Method**: POST
   - **Headers**: 
     - `Content-Type: application/json`
     - `Authorization: Bearer YOUR_AUTH_TOKEN` (if needed)
   - **Schedule**: Daily at midnight (or your preferred time)
   - **Schedule Expression**: `0 0 * * *` (cron format)

### Option 3: Using Windows Task Scheduler (For IIS Deployment)

1. **Create PowerShell Script** (`check-expired-rentals.ps1`):
   ```powershell
   $uri = "https://your-domain.com/api/properties/check-expired-rentals"
   $headers = @{
       "Content-Type" = "application/json"
   }
   
   try {
       $response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers
       Write-Host "Success: $($response.message)"
       Write-Host "Updated properties: $($response.updatedCount)"
   } catch {
       Write-Host "Error: $($_.Exception.Message)"
   }
   ```

2. **Create Scheduled Task**:
   - Open Task Scheduler
   - Create Basic Task
   - **Name**: Check Expired Rentals
   - **Trigger**: Daily at 12:00 AM
   - **Action**: Start a program
   - **Program**: `powershell.exe`
   - **Arguments**: `-File "C:\path\to\check-expired-rentals.ps1"`

### Option 4: Using Node.js Cron (For PM2 Deployment)

1. **Install node-cron**:
   ```bash
   npm install node-cron
   ```

2. **Create cron job file** (`cron-jobs.js`):
   ```javascript
   const cron = require('node-cron')
   const https = require('https')

   // Run daily at midnight
   cron.schedule('0 0 * * *', () => {
     console.log('Checking expired rentals...')
     
     const options = {
       hostname: 'your-domain.com',
       path: '/api/properties/check-expired-rentals',
       method: 'POST',
       headers: {
         'Content-Type': 'application/json'
       }
     }

     const req = https.request(options, (res) => {
       let data = ''
       res.on('data', (chunk) => { data += chunk })
       res.on('end', () => {
         console.log('Response:', data)
       })
     })

     req.on('error', (error) => {
       console.error('Error:', error)
     })

     req.end()
   })

   console.log('Cron job scheduled: Check expired rentals daily at midnight')
   ```

3. **Start with PM2**:
   ```bash
   pm2 start cron-jobs.js --name "rental-expiry-checker"
   pm2 save
   ```

## Testing

### Manual Test via API

```bash
# Using curl
curl -X POST https://your-domain.com/api/properties/check-expired-rentals \
  -H "Content-Type: application/json"

# Using PowerShell
Invoke-RestMethod -Uri "https://your-domain.com/api/properties/check-expired-rentals" -Method Post
```

### Test Database Function Directly

Run in Supabase SQL Editor:
```sql
SELECT * FROM public.update_expired_rentals();
```

## Monitoring

Check the scheduled function logs regularly to ensure it's running:

### Using Supabase CLI (Recommended)
```bash
# View function logs
supabase functions logs check-expired-rentals

# List all functions and their schedules
supabase functions list

# View real-time logs
supabase functions logs check-expired-rentals --follow
```

### Using Supabase Dashboard
- **View Logs**: Go to Supabase Dashboard → **Edge Functions** → **check-expired-rentals** → **Logs**
- You'll see execution logs with timestamps and results
- Look for entries showing the function ran and how many properties were updated

### Verify It's Working
1. **Check Schedule Status**:
   ```bash
   supabase functions list
   ```
   Should show: `check-expired-rentals    scheduled: 0 22 * * *`

2. **Wait for Next Run** (or test manually):
   - The function runs at the scheduled time (e.g., 10 PM UTC / midnight Cairo)
   - Check logs after that time to see execution results

3. **Manual Test** (optional):
   ```bash
   # Invoke the function manually to test
   curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-expired-rentals \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json"
   ```

### Other Monitoring Methods (Alternative Options)
- Windows Task Scheduler: Task Scheduler → Task Scheduler Library → Check history
- PM2: `pm2 logs rental-expiry-checker`
- External Cron Services: Check their respective dashboards

## Recommended Schedule

The schedule is configured in `supabase/config.toml`:

```toml
[functions.check-expired-rentals]
schedule = "0 22 * * *"  # Daily at 10 PM UTC (midnight Cairo time, UTC+2)
```

**Common Options**:
- `"0 0 * * *"` - Daily at midnight UTC
- `"0 22 * * *"` - Daily at 10 PM UTC (midnight Cairo, UTC+2) - **Current**
- `"0 2 * * *"` - Daily at 2 AM UTC
- `"0 */6 * * *"` - Every 6 hours
- `"0 0 * * 0"` - Weekly on Sunday at midnight

**To Change Schedule**:
1. Edit `supabase/config.toml`
2. Update the `schedule` value
3. Redeploy: `supabase functions deploy check-expired-rentals`

## Troubleshooting

### No properties updated
- Check if there are properties with `is_rented = true` and `rental_end_date < NOW()`
- Verify the database function exists: `SELECT * FROM pg_proc WHERE proname = 'update_expired_rentals'`

### API returns 401 Unauthorized
- Ensure the request includes authentication
- For cron jobs, you may need to use a service account or API key

### Function not found
- Run the SQL migration again: `add_rental_end_date.sql`
- Check function exists: `\df update_expired_rentals` in psql

## Notes

- The function only updates properties where:
  - `is_rented = true`
  - `rental_end_date IS NOT NULL`
  - `rental_end_date < NOW()` (date has passed)
- The function is idempotent - safe to run multiple times
- Properties are updated with `updated_at = NOW()` for tracking

