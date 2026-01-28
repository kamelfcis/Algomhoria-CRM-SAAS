# Quick Start: Rental Expiry Check Setup

Choose the easiest solution for your setup:

## 🚀 Option 1: External Cron Service (EASIEST - Recommended)

**Best for**: Production, no server management needed

### Steps:

1. **Sign up for free cron service**:
   - https://cron-job.org (free tier available)
   - Or https://www.easycron.com

2. **Create cron job**:
   - **URL**: `https://your-domain.com/api/properties/check-expired-rentals`
   - **Method**: POST
   - **Headers**: 
     ```
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     Content-Type: application/json
     ```
   - **Schedule**: `0 0 * * *` (daily at midnight UTC)
   - **Body**: Leave empty

3. **Test**: Click "Run now" to test

4. **Done!** ✅

---

## 🖥️ Option 2: Windows Task Scheduler (For Windows Server)

**Best for**: Windows server with IIS

### Quick Setup:

```powershell
# Run as Administrator
npm run cron:setup-windows
```

Or manually:
1. Open Task Scheduler
2. Create Basic Task
3. **Name**: Check Expired Rentals
4. **Trigger**: Daily at 12:00 AM
5. **Action**: Start a program
   - **Program**: `node.exe`
   - **Arguments**: `"D:\gomhoria\scripts\check-expired-rentals.js"`
   - **Start in**: `D:\gomhoria`

### Test:
```powershell
npm run check-rentals
```

---

## 📦 Option 3: Node.js + PM2 (For VPS/Server)

**Best for**: Linux server, VPS, or any server with Node.js

### Setup:

```bash
# Install node-cron
npm install node-cron

# Start cron service
npm run cron:start

# Or with PM2 (recommended)
pm2 start scripts/setup-cron-node.js --name "rental-expiry-checker"
pm2 save
pm2 startup
```

### Test:
```bash
npm run check-rentals
```

---

## 🧪 Test Manually

Test the script anytime:

```bash
npm run check-rentals
```

Or directly:
```bash
node scripts/check-expired-rentals.js
```

---

## 📋 Requirements

Make sure `.env.local` has:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## ✅ Verify It's Working

1. **Run manually**: `npm run check-rentals`
2. **Check output**: Should show "Success" and count of updated properties
3. **Check database**: Properties with expired `rental_end_date` should have `is_rented = false`

---

## 🆘 Need Help?

See detailed guide: `RENTAL_EXPIRY_ALTERNATIVE_SOLUTIONS.md`

