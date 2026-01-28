# Fix: Missing Dependencies During Build

## Problem

The build is failing because:
1. **Missing `autoprefixer`** - This is a dev dependency needed for the build process
2. **Module resolution errors** - Files may be missing or dependencies not installed

## Root Cause

You ran `npm install --production` which only installs production dependencies. However, **dev dependencies are required for building** the Next.js application.

## Solution

### Step 1: Install ALL Dependencies (Including Dev Dependencies)

```powershell
cd C:\inetpub\wwwroot\algomhoria-admin

# Remove existing node_modules (optional, but recommended)
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

# Install ALL dependencies (including dev dependencies)
npm install
```

**Important:** Use `npm install` (not `npm install --production`) because dev dependencies are needed for the build.

---

### Step 2: Verify Project Structure

```powershell
# Check if all required folders exist
dir lib
dir store
dir app
dir components
dir public
```

**Expected folders:**
- `lib/` - Contains `supabase/`, `utils/`, etc.
- `store/` - Contains `auth-store.ts`, `permissions-store.ts`, etc.
- `app/` - Next.js app directory
- `components/` - React components
- `public/` - Static assets

---

### Step 3: Verify Key Files Exist

```powershell
# Check critical files
dir lib\supabase\client.ts
dir store\auth-store.ts
dir store\permissions-store.ts
dir lib\utils\activity-logger.ts
dir tailwind.config.js
dir postcss.config.js
dir next.config.js
dir tsconfig.json
dir package.json
```

**All should exist.** If any are missing, the project transfer was incomplete.

---

### Step 4: Rebuild the Application

```powershell
cd C:\inetpub\wwwroot\algomhoria-admin

# Clean previous build (optional)
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Build again
npm run build
```

**Expected Output:**
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

---

## If Module Resolution Errors Persist

### Check 1: Verify Path Aliases

The `@/` alias should point to the project root. Verify `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Check 2: Verify Files Actually Exist

```powershell
# Check if files exist
Test-Path lib\supabase\client.ts
Test-Path store\auth-store.ts
Test-Path store\permissions-store.ts
Test-Path lib\utils\activity-logger.ts
```

**All should return `True`.** If any return `False`, those files are missing and need to be transferred.

### Check 3: Check File Structure

```powershell
# List lib folder structure
Get-ChildItem -Recurse lib | Select-Object FullName

# List store folder structure
Get-ChildItem -Recurse store | Select-Object FullName
```

---

## Complete Fix Command Sequence

```powershell
cd C:\inetpub\wwwroot\algomhoria-admin

# Step 1: Remove old node_modules
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

# Step 2: Install ALL dependencies
npm install

# Step 3: Clean previous build
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Step 4: Build
npm run build

# Step 5: Verify build success
dir .next
dir .next\routes-manifest.json
dir .next\standalone
```

---

## After Successful Build

Once the build succeeds:

```powershell
# Start with PM2
pm2 start npm --name "algomhoria-admin" -- start

# Check status
pm2 status

# View logs
pm2 logs algomhoria-admin
```

---

## Why Dev Dependencies Are Needed

Even though you're deploying to production, **dev dependencies are required for the build process**:

- `autoprefixer` - CSS processing
- `postcss` - CSS transformation
- `tailwindcss` - CSS framework compilation
- `typescript` - Type checking and compilation
- `eslint` - Code linting

After the build, the standalone output contains everything needed to run, but you still need dev dependencies to create that build.

---

## Alternative: Build Locally, Transfer Build Output

If you continue having issues on the VPS, you can:

1. **Build on your local machine:**
   ```bash
   npm install
   npm run build
   ```

2. **Transfer the complete project** (including `.next` folder) to VPS

3. **On VPS, only install production dependencies:**
   ```powershell
   npm install --production
   ```

4. **Start with PM2:**
   ```powershell
   pm2 start npm --name "algomhoria-admin" -- start
   ```

**Note:** This approach requires transferring the `.next` folder, which can be large.

---

## Summary

**The fix is simple:** Run `npm install` (without `--production`) to install all dependencies, then rebuild.

