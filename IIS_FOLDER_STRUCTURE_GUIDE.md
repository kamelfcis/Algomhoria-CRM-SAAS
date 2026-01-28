# 📁 IIS Folder Structure Guide

## ✅ Correct Folder Structure

Your current structure is **almost correct**, but let me clarify the best setup:

### Option 1: Standard Structure (Recommended for IIS)

```
C:\inetpub\wwwroot\algomhoria-admin\
├── .next\
│   ├── standalone\          ← Server files (minimal)
│   ├── static\              ← Static assets
│   └── BUILD_ID
├── node_modules\            ← Dependencies
├── public\                  ← Public static files
├── .env.production          ← Environment variables
├── package.json
├── package-lock.json
└── web.config               ← IIS configuration
```

**Run from project root:**
```powershell
cd C:\inetpub\wwwroot\algomhoria-admin
pm2 start npm --name "algomhoria-admin" -- start
```

### Option 2: Standalone Structure (Minimal Deployment)

If you want to use ONLY the standalone folder:

```
C:\inetpub\wwwroot\algomhoria-admin\
├── .next\
│   ├── standalone\
│   │   ├── server.js        ← Main server file
│   │   ├── node_modules\   ← Minimal dependencies
│   │   └── package.json
│   └── static\             ← Static assets (needed!)
├── .env.production
└── web.config
```

**Run from standalone folder:**
```powershell
cd C:\inetpub\wwwroot\algomhoria-admin\.next\standalone
pm2 start server.js --name "algomhoria-admin"
```

## ❌ What You Currently Have

Based on your image:
```
C:\inetpub\wwwroot\algomhoria-admin\
├── standalone\             ← This should be .next\standalone\
├── static\                 ← This should be .next\static\
├── node_modules\
├── public\
├── .env.production
├── package.json
└── package-lock.json
```

## 🔧 Fix Your Structure

### Option A: Keep Current Structure (Easier)

**Keep everything as is** and run from project root:

```powershell
# Navigate to your project
cd C:\inetpub\wwwroot\algomhoria-admin

# Install dependencies (if not done)
npm install --production

# Start the application
pm2 start npm --name "algomhoria-admin" -- start
```

**This works because:**
- Next.js will look for `.next` folder
- If it doesn't exist, it will use the build output
- Your `standalone` and `static` folders will be used

### Option B: Fix to Standard Structure (Recommended)

1. **Check if you have `.next` folder:**
   ```powershell
   cd C:\inetpub\wwwroot\algomhoria-admin
   dir .next
   ```

2. **If `.next` folder exists:**
   - Your structure is correct
   - The `standalone` and `static` folders should be inside `.next\`

3. **If `.next` folder doesn't exist:**
   - Rebuild on the server:
   ```powershell
   cd C:\inetpub\wwwroot\algomhoria-admin
   npm run build
   ```
   - This will create the correct structure:
     ```
     .next\
       ├── standalone\
       └── static\
     ```

## ✅ Recommended Setup for IIS

### Structure:
```
C:\inetpub\wwwroot\algomhoria-admin\
├── .next\                   ← Build output (created by npm run build)
│   ├── standalone\
│   └── static\
├── node_modules\            ← Dependencies
├── public\                  ← Public files
├── .env.production          ← Environment variables
├── package.json
├── package-lock.json
└── web.config               ← IIS reverse proxy config
```

### PM2 Command:
```powershell
cd C:\inetpub\wwwroot\algomhoria-admin
pm2 start npm --name "algomhoria-admin" -- start
```

### web.config Location:
Place `web.config` in the **root** of `algomhoria-admin` folder:
```
C:\inetpub\wwwroot\algomhoria-admin\web.config
```

## 🎯 Answer to Your Question

**Should you move `standalone` outside `algomhoria-admin`?**

**NO!** Keep it inside. The structure should be:

```
C:\inetpub\wwwroot\algomhoria-admin\
├── .next\
│   └── standalone\    ← Keep it here (inside .next)
```

OR if you already have it at root level:

```
C:\inetpub\wwwroot\algomhoria-admin\
├── standalone\       ← This is OK too, but not standard
```

**Both will work**, but the standard structure with `.next\standalone\` is recommended.

## 🔍 Quick Check

Run this to verify your structure:

```powershell
cd C:\inetpub\wwwroot\algomhoria-admin
dir
```

You should see:
- ✅ `package.json` - Project file
- ✅ `.env.production` - Environment variables
- ✅ `node_modules\` - Dependencies
- ✅ `public\` - Public files
- ✅ Either `.next\standalone\` OR `standalone\` - Server files
- ✅ `web.config` - IIS config (create if missing)

## 📝 Next Steps

1. **Verify structure** - Check if `.next` folder exists
2. **If missing, rebuild:**
   ```powershell
   npm run build
   ```
3. **Create web.config** in root folder
4. **Start with PM2:**
   ```powershell
   pm2 start npm --name "algomhoria-admin" -- start
   ```

## ⚠️ Important Notes

- **Don't move `standalone` outside** - It needs to be accessible from the project root
- **Keep `static` folder** - Required for static assets
- **`web.config` goes in root** - Not in standalone folder
- **Run from project root** - Not from standalone folder (unless using minimal deployment)

---

**Your current structure will work!** Just make sure:
1. ✅ `web.config` is in the root
2. ✅ Run PM2 from project root
3. ✅ Environment variables are set correctly


