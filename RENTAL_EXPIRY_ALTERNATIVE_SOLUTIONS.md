# Alternative Solutions for Rental Expiry Check

If Supabase scheduled functions don't work, here are reliable alternative solutions:

## 🎯 Quick Comparison

| Solution | Difficulty | Reliability | Best For |
|----------|-----------|------------|----------|
| **External Cron Service** | ⭐ Easy | ⭐⭐⭐⭐⭐ Excellent | Production, no server needed |
| **Node.js Script + PM2** | ⭐⭐ Medium | ⭐⭐⭐⭐ Very Good | VPS/Server deployment |
| **Windows Task Scheduler** | ⭐⭐ Medium | ⭐⭐⭐⭐ Very Good | Windows server/IIS |
| **Next.js API Route** | ⭐ Easy | ⭐⭐⭐ Good | If you have a server running |

---

## ✅ Solution 1: External Cron Service (RECOMMENDED)

**Best for**: Production environments, no server management needed

### Using cron-job.org (Free)

1. **Sign up**: Go to https://cron-job.org (free account available)

2. **Create a new cron job**:
   - **Title**: Check Expired Rentals
   - **Address**: `https://your-domain.com/api/properties/check-expired-rentals`
   - **Schedule**: Daily at midnight (or your preferred time)
   - **Request method**: POST
   - **Request headers**:
     ```
     Content-Type: application/json
     ```
   - **Request body**: Leave empty or `{}`

3. **Test the job**: Click "Run now" to test

4. **Monitor**: View execution history in the dashboard

### Using EasyCron

1. Sign up at https://www.easycron.com
2. Create new cron job
3. Set URL: `https://your-domain.com/api/properties/check-expired-rentals`
4. Method: POST
5. Schedule: `0 0 * * *` (daily at midnight)

### Other Services
- **Cronitor**: https://cronitor.io
- **Uptime Robot**: https://uptimerobot.com (has cron monitoring)
- **Healthchecks.io**: https://healthchecks.io

---

## ✅ Solution 2: Node.js Script + PM2 (For VPS/Server)

**Best for**: You have a server/VPS running Node.js

### Setup Steps

1. **Install dependencies**:
   ```bash
   npm install node-cron
   ```

2. **Start the cron service**:
   ```bash
   # Using PM2 (recommended)
   pm2 start scripts/setup-cron-node.js --name "rental-expiry-checker"
   pm2 save
   pm2 startup  # Auto-start on server reboot
   ```

3. **Monitor**:
   ```bash
   pm2 logs rental-expiry-checker
   pm2 status
   ```

4. **Update schedule** (edit `scripts/setup-cron-node.js`):
   ```javascript
   const SCHEDULE = "0 0 * * *"  // Daily at midnight
   ```

### Environment Variables

Make sure `.env.local` has:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=https://your-domain.com
RENTAL_CHECK_SCHEDULE=0 0 * * *  # Optional: override default schedule
RUN_ON_STARTUP=true  # Optional: run check immediately on startup
```

---

## ✅ Solution 3: Windows Task Scheduler (For Windows Server/IIS)

**Best for**: Windows server with IIS deployment

### Quick Setup

1. **Run the setup script** (as Administrator):
   ```powershell
   # Open PowerShell as Administrator
   cd D:\gomhoria
   .\scripts\setup-cron-windows.ps1
   ```

2. **Or manually create task**:
   - Open Task Scheduler
   - Create Basic Task
   - **Name**: Check Expired Rentals
   - **Trigger**: Daily at 12:00 AM
   - **Action**: Start a program
   - **Program**: `node.exe`
   - **Arguments**: `"D:\gomhoria\scripts\check-expired-rentals.js"`
   - **Start in**: `D:\gomhoria`

3. **Test**:
   ```powershell
   Start-ScheduledTask -TaskName "CheckExpiredRentals"
   ```

4. **View history**:
   - Task Scheduler → Task Scheduler Library → CheckExpiredRentals → History

### Requirements

- Node.js installed and in PATH
- `.env.local` file in project root with required variables

---

## ✅ Solution 4: Standalone Script (Manual/Any Scheduler)

**Best for**: Any system with Node.js, maximum flexibility

### Usage

```bash
# Run manually
node scripts/check-expired-rentals.js

# Or with environment variables
SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/check-expired-rentals.js
```

### Use with Any Cron System

**Linux/Mac crontab**:
```bash
# Edit crontab
crontab -e

# Add this line (runs daily at midnight)
0 0 * * * cd /path/to/gomhoria && /usr/bin/node scripts/check-expired-rentals.js >> /var/log/rental-check.log 2>&1
```

**Docker cron**:
```dockerfile
# In your Dockerfile
RUN apt-get update && apt-get install -y cron
COPY scripts/check-expired-rentals.js /app/scripts/
RUN echo "0 0 * * * cd /app && node scripts/check-expired-rentals.js" | crontab -
```

---

## 🔧 API Endpoint (Already Available)

The API endpoint is already set up at:
- **URL**: `/api/properties/check-expired-rentals`
- **Method**: POST
- **Auth**: Requires authentication (or use service role key)

### Test Manually

```bash
# Using curl
curl -X POST https://your-domain.com/api/properties/check-expired-rentals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

# Using PowerShell
Invoke-RestMethod -Uri "https://your-domain.com/api/properties/check-expired-rentals" `
  -Method Post `
  -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer YOUR_SERVICE_ROLE_KEY"}
```

---

## 📊 Monitoring & Logging

### Check Logs

**External Cron Services**:
- Check their dashboard for execution history

**PM2**:
```bash
pm2 logs rental-expiry-checker
pm2 monit
```

**Windows Task Scheduler**:
- Task Scheduler → Task Scheduler Library → CheckExpiredRentals → History

**Standalone Script**:
- Redirect output to log file:
  ```bash
  node scripts/check-expired-rentals.js >> logs/rental-check.log 2>&1
  ```

### Verify It's Working

1. **Check database**:
   ```sql
   -- See properties that should be updated
   SELECT id, title_en, is_rented, rental_end_date 
   FROM properties 
   WHERE is_rented = true 
   AND rental_end_date < NOW();
   ```

2. **Run manually** and check response:
   ```bash
   node scripts/check-expired-rentals.js
   ```

---

## 🎯 Recommended Setup

**For Production**:
1. ✅ Use **External Cron Service** (cron-job.org) - Easiest, most reliable
2. ✅ Point it to your API endpoint: `https://your-domain.com/api/properties/check-expired-rentals`

**For Development/Testing**:
1. ✅ Use **Standalone Script**: `node scripts/check-expired-rentals.js`
2. ✅ Run manually when needed

**For VPS/Server**:
1. ✅ Use **PM2 + Node.js cron**: `pm2 start scripts/setup-cron-node.js`
2. ✅ Most control, runs on your server

**For Windows Server**:
1. ✅ Use **Windows Task Scheduler**: Run `setup-cron-windows.ps1`
2. ✅ Native Windows solution

---

## 🚨 Troubleshooting

### Script fails with "Missing environment variables"
- Make sure `.env.local` exists in project root
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set

### API returns 401 Unauthorized
- Use service role key in Authorization header
- Or ensure the API route allows unauthenticated access (not recommended for production)

### Task doesn't run
- Check Task Scheduler history for errors
- Verify Node.js is in PATH
- Check script path is correct

### PM2 process stops
- Check logs: `pm2 logs rental-expiry-checker`
- Ensure PM2 is set to auto-restart: `pm2 startup`

---

## 📝 Notes

- All solutions call the same API endpoint or database function
- The database function `update_expired_rentals()` is idempotent (safe to run multiple times)
- Schedule can be adjusted based on your needs
- Consider timezone when setting schedule (UTC vs local time)

