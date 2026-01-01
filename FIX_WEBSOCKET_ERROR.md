# Fix WebSocket Connection Error

## What This Error Means
The error `"The connection to ws://localhost:3000/_next/webpack-hmr was interrupted"` is related to Next.js Hot Module Reload (HMR). It's usually **not critical** and the app should still work.

## Quick Fixes

### Option 1: Refresh the Browser
Simply refresh the page (F5 or Ctrl+R). The WebSocket will reconnect automatically.

### Option 2: Hard Refresh
Clear cache and reload:
- **Windows/Linux**: `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`

### Option 3: Restart Dev Server
1. Stop the server (Ctrl+C in terminal)
2. Start it again: `npm run dev`
3. Refresh browser

### Option 4: Clear Browser Cache
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

## Why This Happens

- Dev server was restarted while browser was open
- Network interruption
- Browser extension blocking WebSocket connections
- Firewall/antivirus blocking WebSocket

## If Error Persists

### Check Dev Server Status
Make sure `npm run dev` is running and shows:
```
✓ Ready in X.Xs
- Local: http://localhost:3000
```

### Check for Port Conflicts
If port 3000 is busy, Next.js will use a different port. Check the terminal output.

### Disable Browser Extensions
Some extensions (ad blockers, privacy tools) can block WebSocket connections. Try:
1. Open in incognito/private mode
2. Or disable extensions temporarily

### Check Firewall/Antivirus
Make sure your firewall/antivirus isn't blocking `localhost:3000`

## This is Normal

This error is **common in development** and usually doesn't affect functionality. Your app should still work - you just might not get hot reload until you refresh.

## Verify Everything Works

1. ✅ Page loads correctly
2. ✅ You can navigate between pages
3. ✅ Login works
4. ✅ Dashboard displays

If all of these work, the WebSocket error is just a warning and can be ignored.

