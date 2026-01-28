# Quick Fix for Build Error

## Run These Commands on Your VPS

```powershell
cd C:\inetpub\wwwroot\algomhoria-admin

# Remove old node_modules
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

# Install ALL dependencies (including dev dependencies - needed for build)
npm install

# Clean previous build attempt
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Build again
npm run build
```

## Why This Works

- `npm install` (without `--production`) installs **all dependencies**, including dev dependencies
- Dev dependencies like `autoprefixer`, `postcss`, `tailwindcss` are **required for the build process**
- After build succeeds, you can use the standalone output to run the app

## After Build Succeeds

```powershell
# Start with PM2
pm2 start npm --name "algomhoria-admin" -- start

# Check status
pm2 status
```

---

**That's it!** The build should work now.

