# Publish Artifacts (Production)

This project uses Next.js App Router with:

- `output: 'standalone'` in `next.config.js`
- IIS + PM2 deployment flow

Because your recent build showed a standalone trace copy warning, use the **full-project publish** method first.

## Recommended Now (Most Reliable)

Copy these folders/files to the server:

- `app/`
- `components/`
- `lib/`
- `hooks/`
- `messages/`
- `public/`
- `store/`
- `package.json`
- `package-lock.json`
- `next.config.js`
- `tsconfig.json`
- `tailwind.config.ts`
- `.env.production`
- `web.config` (for IIS)

Do **not** copy:

- `.next/` (rebuild on server)
- `node_modules/` (reinstall on server)
- `.git/`

## Server Commands

```powershell
cd C:\inetpub\wwwroot\algomhoria-admin
npm install --production
npm run build
pm2 start npm --name "algomhoria-admin" -- start
pm2 save
```

## Optional Lean Publish (After Standalone Warning Is Fixed)

If standalone build is clean, you can copy only:

- `.next/standalone/`
- `.next/static/`
- `public/`

Then run:

```powershell
node server.js
```

## Post-Publish Quick Checks

1. Open `/`, `/properties`, and `/listing/[code]`.
2. Confirm no hydration errors in browser console.
3. Run `npm run build` on server without errors.
4. Verify API routes:
   - `/api/landing/home?locale=ar`
   - `/api/landing/filters?locale=ar`
   - `/api/landing/properties?locale=ar`

