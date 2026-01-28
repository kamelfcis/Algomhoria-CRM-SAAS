# Fix: Missing .next/routes-manifest.json

## Problem
Next.js is looking for `.next\routes-manifest.json` but it doesn't exist. This means the build is missing or incomplete.

## Solution: Rebuild the Application

Run these commands on your VPS:

```powershell
# 1. Navigate to project directory
cd C:\inetpub\wwwroot\algomhoria-admin

# 2. Stop PM2 (if running)
pm2 stop algomhoria-admin
pm2 delete algomhoria-admin

# 3. Clean previous build (optional but recommended)
if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" }

# 4. Rebuild the application
npm run build

# 5. Verify build was successful
# You should see:
# ✓ Compiled successfully
# ✓ Linting and checking validity of types

# 6. Check if .next folder exists
dir .next

# 7. Check if routes-manifest.json exists
dir .next\routes-manifest.json

# 8. Start PM2 again
pm2 start npm --name "algomhoria-admin" -- start

# 9. Check status
pm2 status

# 10. View logs
pm2 logs algomhoria-admin
```

## Quick Fix (One Command)

If you want to do it all at once:

```powershell
cd C:\inetpub\wwwroot\algomhoria-admin && pm2 delete algomhoria-admin && npm run build && pm2 start npm --name "algomhoria-admin" -- start && pm2 logs algomhoria-admin
```

## Verify Build Success

After running `npm run build`, you should see:

```
✓ Compiled successfully
✓ Linting and checking validity of types
```

And these files/folders should exist:
- `.next\` folder
- `.next\routes-manifest.json`
- `.next\standalone\` (if using standalone output)
- `.next\static\`

## If Build Fails

If `npm run build` fails, check:

1. **Dependencies installed:**
   ```powershell
   npm install --production
   ```

2. **Node.js version (should be 18+):**
   ```powershell
   node --version
   ```

3. **Environment variables:**
   ```powershell
   # Verify .env.production exists
   dir .env.production
   ```

4. **Check build errors:**
   - Look for specific error messages
   - Common issues: missing dependencies, TypeScript errors, environment variables

## After Successful Build

Once the build completes successfully:

1. **Start PM2:**
   ```powershell
   pm2 start npm --name "algomhoria-admin" -- start
   ```

2. **Verify it's running:**
   ```powershell
   pm2 status
   ```
   Should show status: `online` (green)

3. **Test the application:**
   - Open browser: `http://localhost:3000`
   - Or via IIS: `http://your-domain`

## Common Build Issues

### Issue: "Cannot find module"
**Fix:** `npm install --production`

### Issue: TypeScript errors
**Fix:** Check for type errors in your code, or temporarily disable type checking in build

### Issue: Environment variables missing
**Fix:** Create `.env.production` with required variables

### Issue: Out of memory
**Fix:** Increase Node.js memory: `set NODE_OPTIONS=--max-old-space-size=4096`

## Expected File Structure After Build

```
C:\inetpub\wwwroot\algomhoria-admin\
├── .next\
│   ├── routes-manifest.json  ← This file must exist!
│   ├── build-manifest.json
│   ├── standalone\
│   └── static\
├── node_modules\
├── public\
├── .env.production
├── package.json
└── web.config
```


