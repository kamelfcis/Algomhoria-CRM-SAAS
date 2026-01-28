# Complete Project Deployment Guide

## Problem
The error "Couldn't find any `pages` or `app` directory" means you only transferred build artifacts, not the complete source code.

## Solution: Transfer Complete Project

You need to transfer ALL project files, not just the build output.

## What Files/Folders You Need

### Required (Must Have):
- ✅ `app\` - Your application source code (App Router)
- ✅ `components\` - React components
- ✅ `lib\` - Utility libraries
- ✅ `hooks\` - Custom hooks
- ✅ `messages\` - Translation files
- ✅ `public\` - Public static files
- ✅ `store\` - State management
- ✅ `package.json` - Dependencies
- ✅ `package-lock.json` - Lock file
- ✅ `next.config.js` - Next.js configuration
- ✅ `tsconfig.json` - TypeScript configuration
- ✅ `tailwind.config.ts` - Tailwind configuration
- ✅ `.env.production` - Environment variables
- ✅ `web.config` - IIS configuration

### Optional (Can Rebuild):
- `node_modules\` - Can be rebuilt with `npm install`
- `.next\` - Can be rebuilt with `npm run build`

## Complete Folder Structure

Your project should look like this:

```
C:\inetpub\wwwroot\algomhoria-admin\
├── app\                    ← REQUIRED: Source code
│   ├── api\
│   ├── auth\
│   ├── dashboard\
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components\             ← REQUIRED: Components
├── hooks\                  ← REQUIRED: Custom hooks
├── lib\                    ← REQUIRED: Utilities
├── messages\               ← REQUIRED: Translations
├── public\                 ← REQUIRED: Static files
├── store\                  ← REQUIRED: State management
├── node_modules\           ← Can rebuild
├── .next\                  ← Will be created by build
├── .env.production         ← REQUIRED: Environment variables
├── package.json            ← REQUIRED
├── package-lock.json       ← REQUIRED
├── next.config.js          ← REQUIRED
├── tsconfig.json           ← REQUIRED
├── tailwind.config.ts      ← REQUIRED
└── web.config              ← REQUIRED: IIS config
```

## How to Transfer Complete Project

### Option 1: Using Git (Recommended)

On your VPS:

```powershell
# 1. Remove incomplete project
cd C:\inetpub\wwwroot
Remove-Item -Recurse -Force algomhoria-admin

# 2. Clone complete project
git clone <your-repository-url> algomhoria-admin

# 3. Navigate to project
cd algomhoria-admin

# 4. Install dependencies
npm install --production

# 5. Create .env.production
notepad .env.production
# Add your environment variables

# 6. Build
npm run build

# 7. Start with PM2
pm2 start npm --name "algomhoria-admin" -- start
```

### Option 2: Using RDP File Transfer

1. **On your local machine:**
   - Compress the ENTIRE project folder (excluding `node_modules` and `.next`)
   - Create a ZIP file

2. **Transfer to VPS:**
   - Use Remote Desktop to copy the ZIP
   - Or use FTP/SFTP

3. **On VPS:**
   ```powershell
   # Extract to temp location
   # Then move to wwwroot
   Move-Item -Path "extracted-folder\*" -Destination "C:\inetpub\wwwroot\algomhoria-admin\" -Force
   
   # Install dependencies
   cd C:\inetpub\wwwroot\algomhoria-admin
   npm install --production
   
   # Build
   npm run build
   
   # Start
   pm2 start npm --name "algomhoria-admin" -- start
   ```

### Option 3: Using FTP/SFTP

1. **Use FileZilla or WinSCP**
2. **Upload complete project** (excluding `node_modules` and `.next`)
3. **On VPS:**
   ```powershell
   cd C:\inetpub\wwwroot\algomhoria-admin
   npm install --production
   npm run build
   pm2 start npm --name "algomhoria-admin" -- start
   ```

## Quick Checklist

Before building, verify you have:

- [ ] `app\` folder exists
- [ ] `components\` folder exists
- [ ] `lib\` folder exists
- [ ] `hooks\` folder exists
- [ ] `messages\` folder exists
- [ ] `public\` folder exists
- [ ] `package.json` exists
- [ ] `next.config.js` exists
- [ ] `tsconfig.json` exists
- [ ] `.env.production` exists

## Verify Project Structure

Run this on your VPS:

```powershell
cd C:\inetpub\wwwroot\algomhoria-admin

Write-Host "=== Checking Required Files ===" -ForegroundColor Cyan
if (Test-Path "app") { Write-Host "✓ app folder exists" -ForegroundColor Green } else { Write-Host "✗ app folder MISSING" -ForegroundColor Red }
if (Test-Path "components") { Write-Host "✓ components folder exists" -ForegroundColor Green } else { Write-Host "✗ components folder MISSING" -ForegroundColor Red }
if (Test-Path "lib") { Write-Host "✓ lib folder exists" -ForegroundColor Green } else { Write-Host "✗ lib folder MISSING" -ForegroundColor Red }
if (Test-Path "package.json") { Write-Host "✓ package.json exists" -ForegroundColor Green } else { Write-Host "✗ package.json MISSING" -ForegroundColor Red }
if (Test-Path "next.config.js") { Write-Host "✓ next.config.js exists" -ForegroundColor Green } else { Write-Host "✗ next.config.js MISSING" -ForegroundColor Red }
if (Test-Path ".env.production") { Write-Host "✓ .env.production exists" -ForegroundColor Green } else { Write-Host "✗ .env.production MISSING" -ForegroundColor Red }
```

## After Complete Transfer

1. **Install dependencies:**
   ```powershell
   npm install --production
   ```

2. **Build:**
   ```powershell
   npm run build
   ```

3. **Start:**
   ```powershell
   pm2 start npm --name "algomhoria-admin" -- start
   ```

## What NOT to Transfer

You can skip these (they'll be rebuilt):
- `node_modules\` - Rebuilt with `npm install`
- `.next\` - Rebuilt with `npm run build`
- `.git\` - Not needed for production
- `*.log` - Log files

## Summary

**The issue:** You only transferred build artifacts, not source code.

**The fix:** Transfer the complete project including the `app\` folder and all source files.

**Next steps:**
1. Transfer complete project (with `app\` folder)
2. Run `npm install --production`
3. Run `npm run build`
4. Start with PM2


