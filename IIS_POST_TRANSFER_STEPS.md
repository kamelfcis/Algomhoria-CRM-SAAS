# Next Steps After Transferring Complete Project

## Step-by-Step Guide

### Step 1: Verify Project Structure

```powershell
cd C:\inetpub\wwwroot\algomhoria-admin

# Check if app folder exists
dir app

# Check if package.json exists
dir package.json

# Check if next.config.js exists
dir next.config.js
```

**Expected:** All should exist. If not, the transfer is incomplete.

---

### Step 2: Install Dependencies

```powershell
cd C:\inetpub\wwwroot\algomhoria-admin

# Install production dependencies
npm install --production
```

**Expected Output:**
- Dependencies will be installed
- `node_modules` folder will be created
- May take a few minutes

**If errors occur:**
- Check Node.js version: `node --version` (should be 18+)
- Check npm version: `npm --version`
- Try: `npm cache clean --force` then `npm install --production`

---

### Step 3: Create/Verify Environment Variables

```powershell
# Check if .env.production exists
dir .env.production

# If missing, create it
notepad .env.production
```

**Add these variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key-here
NODE_ENV=production
PORT=3000
```

**Important:** Replace with your actual values!

---

### Step 4: Build the Application

```powershell
cd C:\inetpub\wwwroot\algomhoria-admin

# Build for production
npm run build
```

**Expected Output:**
```
✓ Compiled successfully
✓ Linting and checking validity of types
```

**This will create:**
- `.next\` folder
- `.next\routes-manifest.json`
- `.next\standalone\` folder
- `.next\static\` folder

**If build fails:**
- Check error messages
- Common issues: missing dependencies, TypeScript errors, environment variables

---

### Step 5: Verify Build Success

```powershell
# Check if .next folder exists
dir .next

# Check if routes-manifest.json exists
dir .next\routes-manifest.json

# Check if standalone folder exists
dir .next\standalone
```

**All should exist** if build was successful.

---

### Step 6: Create/Verify web.config

```powershell
# Check if web.config exists
dir web.config

# If missing, create it (copy from your local project or use the one we created)
notepad web.config
```

**Location:** `C:\inetpub\wwwroot\algomhoria-admin\web.config`

**Content:** Use the `web.config` file we created earlier (reverse proxy configuration).

---

### Step 7: Start Application with PM2

```powershell
cd C:\inetpub\wwwroot\algomhoria-admin

# Stop any existing PM2 processes
pm2 delete all

# Start the application
pm2 start npm --name "algomhoria-admin" -- start

# Check status
pm2 status
```

**Expected Status:** `online` (green)

**If status is `errored` or `stopped`:**
```powershell
# Check logs
pm2 logs algomhoria-admin --lines 50
```

---

### Step 8: Configure PM2 to Start on Boot

```powershell
# Save PM2 configuration
pm2 save

# Setup PM2 to start on Windows boot
pm2 startup
```

**Note:** `pm2 startup` will give you a command to run as Administrator. Copy and run that command.

---

### Step 9: Configure IIS (If Not Done)

#### 9.1 Install Required IIS Modules

- **URL Rewrite Module:** https://www.iis.net/downloads/microsoft/url-rewrite
- **Application Request Routing (ARR):** https://www.iis.net/downloads/microsoft/application-request-routing

#### 9.2 Enable ARR Proxy

1. Open **IIS Manager**
2. Click on your **server name** (not a site)
3. Double-click **Application Request Routing Cache**
4. Click **Server Proxy Settings**
5. Check ✅ **Enable proxy**
6. Click **Apply**

#### 9.3 Create IIS Website

1. Open **IIS Manager**
2. Right-click **Sites** → **Add Website**
3. Fill in:
   - **Site name:** `algomhoria-admin`
   - **Application pool:** Create new (auto-created)
   - **Physical path:** `C:\inetpub\wwwroot\algomhoria-admin`
   - **Binding:**
     - **Type:** `http`
     - **IP address:** `All Unassigned`
     - **Port:** `80`
     - **Host name:** Your domain (or leave blank)
4. Click **OK**

#### 9.4 Configure Application Pool

1. Expand **Application Pools**
2. Find `algomhoria-admin`
3. Right-click → **Advanced Settings**
4. Set:
   - **.NET CLR Version:** `No Managed Code`
   - **Managed Pipeline Mode:** `Integrated`
   - **Start Mode:** `AlwaysRunning`
5. Click **OK**

---

### Step 10: Test the Application

#### 10.1 Test Node.js Directly

```powershell
# Open browser on VPS
# Navigate to: http://localhost:3000
```

**Expected:** Application should load

#### 10.2 Test via IIS

```powershell
# Open browser on VPS
# Navigate to: http://localhost
# Or: http://your-domain
```

**Expected:** Application should load (via reverse proxy)

#### 10.3 Test from External Network

- Open browser on your local machine
- Navigate to: `http://your-vps-ip` or `http://your-domain`

**Expected:** Application should load

---

### Step 11: Configure Firewall (If Needed)

```powershell
# Allow HTTP (Port 80)
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow

# Allow HTTPS (Port 443) - if using SSL
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow
```

---

### Step 12: Monitor and Verify

```powershell
# Check PM2 status
pm2 status

# View logs
pm2 logs algomhoria-admin

# Monitor resources
pm2 monit
```

---

## Troubleshooting

### Issue: PM2 shows "errored"

**Solution:**
```powershell
pm2 logs algomhoria-admin --lines 50
# Check the error message and fix accordingly
```

### Issue: 502 Bad Gateway in IIS

**Solutions:**
1. Verify PM2 is running: `pm2 status`
2. Verify app is on port 3000: `netstat -ano | findstr :3000`
3. Check IIS Application Pool is started
4. Verify `web.config` is in correct location

### Issue: Application not loading

**Solutions:**
1. Check PM2 logs: `pm2 logs algomhoria-admin`
2. Check IIS logs: `C:\inetpub\logs\LogFiles\`
3. Verify environment variables are set
4. Check firewall rules

---

## Quick Command Summary

```powershell
# Complete setup (after transferring project)
cd C:\inetpub\wwwroot\algomhoria-admin
npm install --production
npm run build
pm2 start npm --name "algomhoria-admin" -- start
pm2 save
pm2 startup
pm2 status
pm2 logs algomhoria-admin
```

---

## Success Checklist

- [ ] Project structure verified (app folder exists)
- [ ] Dependencies installed (`npm install --production`)
- [ ] Environment variables configured (`.env.production`)
- [ ] Application built successfully (`npm run build`)
- [ ] `.next` folder created
- [ ] `web.config` in place
- [ ] PM2 running (`pm2 status` shows `online`)
- [ ] Application accessible on `http://localhost:3000`
- [ ] IIS configured and working
- [ ] Application accessible via IIS (`http://localhost` or domain)
- [ ] Firewall configured (if needed)
- [ ] PM2 set to start on boot

---

## Next Steps After Success

1. **Configure SSL/HTTPS** (recommended)
2. **Set up monitoring** (PM2 monitoring, IIS logs)
3. **Configure backups** (database, files)
4. **Set up domain** (if not already done)
5. **Test all features** (login, dashboard, etc.)

---

**You're done!** Your application should now be running on IIS. 🎉

