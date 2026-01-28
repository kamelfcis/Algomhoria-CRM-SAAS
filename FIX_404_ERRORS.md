# Fix 404 Errors

## The Errors You're Seeing

These 404 errors are **normal** during Next.js development and will resolve when:

1. **The dev server finishes compiling** - Next.js generates these files on startup
2. **You restart the dev server** - Clears any stale build cache

## Files Causing 404s

- `e4af272ccee01ff0-s.p.woff2` - Next.js font file (auto-generated)
- `main-app.js` - Next.js app bundle (auto-generated)
- `app-pages-internals.js` - Next.js internal bundle (auto-generated)
- `favicon.ico` - Favicon file (optional)

## Solution

### Step 1: Stop Dev Server
Press `Ctrl+C` in the terminal where `npm run dev` is running

### Step 2: Clear Cache
```powershell
Remove-Item -Recurse -Force .next
```

### Step 3: Restart Dev Server
```bash
npm run dev
```

### Step 4: Wait for Compilation
Wait until you see:
```
✓ Ready in X.Xs
- Local: http://localhost:3000
```

### Step 5: Hard Refresh Browser
- **Windows/Linux:** `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac:** `Cmd + Shift + R`

## Why This Happens

Next.js generates these files dynamically during development. If the dev server hasn't finished compiling, or if there's a stale cache, these files won't exist yet, causing 404 errors.

## If Errors Persist

1. **Check terminal** - Look for compilation errors
2. **Check browser console** - Look for other errors
3. **Verify Node.js version** - Should be 18+
4. **Delete node_modules and reinstall:**
   ```powershell
   Remove-Item -Recurse -Force node_modules
   npm install
   npm run dev
   ```

## Note About Favicon

The favicon.ico 404 is harmless. If you want to add one:
1. Place `favicon.ico` in the `public/` folder
2. Or use the existing `logo.png` (already configured)

---

**These errors should disappear once the dev server finishes compiling!** ✅

