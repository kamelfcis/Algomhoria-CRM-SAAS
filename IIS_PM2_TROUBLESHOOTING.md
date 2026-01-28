# PM2 Troubleshooting Guide for IIS Deployment

## Issue: PM2 Shows "errored" or "stopped" Status

If your PM2 process shows `errored` or `stopped` status, follow these steps:

## Step 1: Check PM2 Logs

```powershell
# View recent logs
pm2 logs algomhoria-admin --lines 50

# Or view all logs
pm2 logs algomhoria-admin
```

This will show you the actual error message.

## Step 2: Common Issues and Solutions

### Issue 1: Missing Dependencies

**Error:** `Cannot find module 'xxx'` or `MODULE_NOT_FOUND`

**Solution:**
```powershell
cd C:\inetpub\wwwroot\algomhoria-admin
npm install --production
```

### Issue 2: Build Not Found

**Error:** `Could not find a production build` or `.next folder not found`

**Solution:**
```powershell
cd C:\inetpub\wwwroot\algomhoria-admin
npm run build
```

### Issue 3: Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**
```powershell
# Check what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or change the port in your .env.production
# Add: PORT=3001
```

### Issue 4: Environment Variables Missing

**Error:** `NEXT_PUBLIC_SUPABASE_URL is not defined` or similar

**Solution:**
```powershell
# Verify .env.production exists
cd C:\inetpub\wwwroot\algomhoria-admin
dir .env.production

# If missing, create it with required variables:
notepad .env.production
```

Add these variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NODE_ENV=production
PORT=3000
```

### Issue 5: Wrong Working Directory

**Error:** Various file not found errors

**Solution:**
```powershell
# Stop PM2
pm2 stop algomhoria-admin
pm2 delete algomhoria-admin

# Start with explicit working directory
cd C:\inetpub\wwwroot\algomhoria-admin
pm2 start npm --name "algomhoria-admin" -- start --cwd "C:\inetpub\wwwroot\algomhoria-admin"
```

### Issue 6: Node.js Version Issue

**Error:** Syntax errors or module compatibility issues

**Solution:**
```powershell
# Check Node.js version (should be 18+)
node --version

# If version is too old, update Node.js from nodejs.org
```

## Step 3: Alternative Start Methods

### Method 1: Direct Node.js Start (for testing)

```powershell
cd C:\inetpub\wwwroot\algomhoria-admin
node node_modules/next/dist/bin/next start
```

If this works, the issue is with PM2 configuration.

### Method 2: Using PM2 Ecosystem File

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'algomhoria-admin',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: 'C:\\inetpub\\wwwroot\\algomhoria-admin',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'C:\\inetpub\\wwwroot\\algomhoria-admin\\logs\\pm2-error.log',
    out_file: 'C:\\inetpub\\wwwroot\\algomhoria-admin\\logs\\pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false
  }]
}
```

Then start:
```powershell
pm2 start ecosystem.config.js
```

### Method 3: Using Standalone Mode

If you have `.next/standalone` folder:

```powershell
cd C:\inetpub\wwwroot\algomhoria-admin\.next\standalone
pm2 start server.js --name "algomhoria-admin"
```

## Step 4: Verify Setup

Run these checks:

```powershell
# 1. Check if you're in the right directory
cd C:\inetpub\wwwroot\algomhoria-admin
pwd

# 2. Check if package.json exists
dir package.json

# 3. Check if node_modules exists
dir node_modules

# 4. Check if .next folder exists
dir .next

# 5. Check if .env.production exists
dir .env.production

# 6. Check Node.js version
node --version

# 7. Check npm version
npm --version
```

## Step 5: Clean Start

If nothing works, try a clean start:

```powershell
# 1. Stop and delete PM2 process
pm2 stop algomhoria-admin
pm2 delete algomhoria-admin

# 2. Navigate to project
cd C:\inetpub\wwwroot\algomhoria-admin

# 3. Reinstall dependencies
npm install --production

# 4. Rebuild
npm run build

# 5. Start fresh
pm2 start npm --name "algomhoria-admin" -- start

# 6. Check status
pm2 status

# 7. View logs
pm2 logs algomhoria-admin
```

## Step 6: Check Application Manually

Test if the app works without PM2:

```powershell
cd C:\inetpub\wwwroot\algomhoria-admin
npm start
```

If this works, the issue is with PM2. If this doesn't work, the issue is with the application itself.

## Common Error Messages

### "Cannot find module 'next'"
**Fix:** `npm install --production`

### "Could not find a production build"
**Fix:** `npm run build`

### "EADDRINUSE"
**Fix:** Change port or kill existing process

### "NEXT_PUBLIC_* is not defined"
**Fix:** Check `.env.production` file

### "Permission denied"
**Fix:** Run PowerShell as Administrator

## Quick Diagnostic Script

Run this to check everything:

```powershell
cd C:\inetpub\wwwroot\algomhoria-admin

Write-Host "=== Checking Setup ===" -ForegroundColor Cyan
Write-Host "Node version: $(node --version)"
Write-Host "NPM version: $(npm --version)"
Write-Host "Current directory: $(Get-Location)"
Write-Host ""

Write-Host "=== Checking Files ===" -ForegroundColor Cyan
if (Test-Path "package.json") { Write-Host "✓ package.json exists" -ForegroundColor Green } else { Write-Host "✗ package.json missing" -ForegroundColor Red }
if (Test-Path "node_modules") { Write-Host "✓ node_modules exists" -ForegroundColor Green } else { Write-Host "✗ node_modules missing" -ForegroundColor Red }
if (Test-Path ".next") { Write-Host "✓ .next folder exists" -ForegroundColor Green } else { Write-Host "✗ .next folder missing - run npm run build" -ForegroundColor Red }
if (Test-Path ".env.production") { Write-Host "✓ .env.production exists" -ForegroundColor Green } else { Write-Host "✗ .env.production missing" -ForegroundColor Red }
Write-Host ""

Write-Host "=== Checking Port 3000 ===" -ForegroundColor Cyan
$port = netstat -ano | findstr :3000
if ($port) { Write-Host "⚠ Port 3000 is in use" -ForegroundColor Yellow; Write-Host $port } else { Write-Host "✓ Port 3000 is available" -ForegroundColor Green }
```

## Next Steps

After checking logs, share the error message and I'll help you fix it!


