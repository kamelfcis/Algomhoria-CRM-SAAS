# IIS Reverse Proxy Deployment Guide (Without iisnode)

This guide explains how to deploy your Next.js application on IIS Server **without using iisnode**. Instead, we'll run Next.js as a standalone Node.js process and use IIS as a reverse proxy.

## How It Works

```
Internet → IIS (Port 80/443) → Reverse Proxy → Node.js Process (Port 3000) → Next.js App
```

- **IIS** handles incoming HTTP/HTTPS requests
- **IIS URL Rewrite** forwards requests to your Node.js process
- **Node.js** runs your Next.js application independently
- **PM2** manages the Node.js process (auto-restart, monitoring, etc.)

## Advantages of This Method

✅ **No iisnode dependency** - Pure Node.js execution  
✅ **Better performance** - Direct Node.js process  
✅ **Easier debugging** - Standard Node.js logs  
✅ **Process management** - PM2 handles restarts and monitoring  
✅ **Scalability** - Can run multiple instances  
✅ **Standard deployment** - Works like any Node.js app  

---

## Step-by-Step Deployment

### Step 1: Prerequisites

#### 1.1 Install Node.js
- Download **Node.js 18.x or higher** from [nodejs.org](https://nodejs.org/)
- Install with "Add to PATH" option
- Verify installation:
  ```powershell
  node --version
  npm --version
  ```

#### 1.2 Install IIS
1. Open **Control Panel** → **Programs** → **Turn Windows features on or off**
2. Enable:
   - ✅ **Internet Information Services (IIS)**
   - ✅ **IIS Management Console**
   - ✅ **World Wide Web Services** → **Application Development Features** → **ASP.NET** (optional)

#### 1.3 Install IIS URL Rewrite Module
- Download from: [Microsoft URL Rewrite Module](https://www.iis.net/downloads/microsoft/url-rewrite)
- Install the module (required for reverse proxy)

#### 1.4 Install Application Request Routing (ARR)
- Download from: [Microsoft ARR](https://www.iis.net/downloads/microsoft/application-request-routing)
- Install ARR (enables reverse proxy functionality)

---

### Step 2: Enable ARR Proxy

1. Open **IIS Manager**
2. Click on your **server name** (not a site)
3. Double-click **Application Request Routing Cache**
4. Click **Server Proxy Settings** (in the right panel)
5. Check ✅ **Enable proxy**
6. Click **Apply**

---

### Step 3: Build Your Application

On your development machine or build server:

```powershell
# Navigate to your project
cd D:\gomhoria

# Install dependencies
npm install

# Build for production
npm run build
```

This creates:
- `.next/standalone/` - Server files
- `.next/static/` - Static assets
- `.next/BUILD_ID` - Build identifier

---

### Step 4: Deploy Files to IIS Server

#### 4.1 Create Application Directory

On your IIS server, create a directory for your application:

```powershell
# Create directory (adjust path as needed)
New-Item -ItemType Directory -Path "C:\inetpub\wwwroot\algomhoria-admin"
```

#### 4.2 Copy Required Files

Copy these files/folders from your build to the server:

```
Required Files:
├── .next/
│   ├── standalone/          # Copy entire folder
│   ├── static/              # Copy entire folder
│   └── BUILD_ID             # Copy file
├── public/                  # Copy entire folder (if exists)
├── package.json             # Copy file
└── .env.production          # Create this file (see Step 5)
```

**Note**: You don't need to copy `node_modules` - the standalone build includes only necessary dependencies.

---

### Step 5: Configure Environment Variables

Create `.env.production` in your application root (`C:\inetpub\wwwroot\algomhoria-admin\.env.production`):

```env
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_APP_URL=https://your-domain.com
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key-here
```

**Security Note**: Ensure `.env.production` is not accessible via web (we'll configure this in web.config).

---

### Step 6: Install PM2 (Process Manager)

PM2 will manage your Node.js process (auto-restart, monitoring, etc.):

```powershell
# Install PM2 globally
npm install -g pm2

# Install PM2 Windows startup script
npm install -g pm2-windows-startup

# Configure PM2 to start on Windows boot
pm2-startup install
```

---

### Step 7: Start Your Next.js Application

```powershell
# Navigate to your application directory
cd C:\inetpub\wwwroot\algomhoria-admin

# Start the application with PM2
pm2 start .next/standalone/server.js --name "algomhoria-admin" --interpreter node

# Save PM2 configuration (so it persists after reboot)
pm2 save

# Check status
pm2 status

# View logs
pm2 logs algomhoria-admin
```

**Important**: Note the port your app is running on (default is usually 3000). You'll need this for the reverse proxy configuration.

To check the port:
```powershell
# View PM2 logs to see which port it's using
pm2 logs algomhoria-admin --lines 20
```

Or check the standalone server.js - it typically runs on port 3000 by default, but you can set it via `PORT` environment variable.

---

### Step 8: Configure IIS Site

#### 8.1 Create IIS Website

1. Open **IIS Manager**
2. Right-click **Sites** → **Add Website**
3. Configure:
   - **Site name**: `algomhoria-admin` (or your preferred name)
   - **Application pool**: Create new (or select existing)
   - **Physical path**: `C:\inetpub\wwwroot\algomhoria-admin`
   - **Binding**:
     - **Type**: http
     - **IP address**: All Unassigned (or specific IP)
     - **Port**: 80
     - **Host name**: your-domain.com (optional, leave blank for default)

#### 8.2 Configure Application Pool

1. Select your **Application Pool**
2. Right-click → **Advanced Settings**
3. Configure:
   - **.NET CLR Version**: No Managed Code
   - **Managed Pipeline Mode**: Integrated
   - **Start Mode**: AlwaysRunning (recommended)
   - **Idle Time-out**: 0 (prevents app from stopping)

---

### Step 9: Create web.config for Reverse Proxy

Create `web.config` in your application root (`C:\inetpub\wwwroot\algomhoria-admin\web.config`):

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <!-- URL Rewrite Rules for Reverse Proxy -->
    <rewrite>
      <rules>
        <!-- Force HTTPS redirect (uncomment if using SSL) -->
        <!--
        <rule name="HTTP to HTTPS redirect" stopProcessing="true">
          <match url="(.*)" />
          <conditions>
            <add input="{HTTPS}" pattern="off" ignoreCase="true" />
          </conditions>
          <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
        </rule>
        -->

        <!-- Reverse Proxy Rule: Forward all requests to Next.js server -->
        <rule name="ReverseProxyInboundRule" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:3000/{R:1}" />
          <serverVariables>
            <!-- Forward protocol information -->
            <set name="HTTP_X_FORWARDED_PROTO" value="https" />
            <!-- Forward host information -->
            <set name="HTTP_X_FORWARDED_HOST" value="{HTTP_HOST}" />
            <!-- Forward client IP address -->
            <set name="HTTP_X_FORWARDED_FOR" value="{REMOTE_ADDR}" />
            <!-- Forward original request URI -->
            <set name="HTTP_X_ORIGINAL_URI" value="{REQUEST_URI}" />
          </serverVariables>
        </rule>
      </rules>
    </rewrite>

    <!-- Security: Hide sensitive files -->
    <security>
      <requestFiltering>
        <hiddenSegments>
          <add segment=".env.production" />
          <add segment=".env.local" />
          <add segment="node_modules" />
          <add segment=".next" />
        </hiddenSegments>
      </requestFiltering>
    </security>

    <!-- Make sure error responses are left untouched -->
    <httpErrors existingResponse="PassThrough" />
  </system.webServer>
</configuration>
```

**Important**: 
- Change `localhost:3000` to match your actual Node.js server port if different
- If using HTTPS, uncomment the HTTPS redirect rule

#### 9.1 Allow Server Variables in URL Rewrite

To use `HTTP_X_FORWARDED_PROTO` and other server variables, you need to allow them:

1. Open **IIS Manager**
2. Click on your **server name** (not a site)
3. Double-click **URL Rewrite**
4. Click **View Server Variables** (in the right panel)
5. Click **Add** and add these variables:
   - `HTTP_X_FORWARDED_PROTO`
   - `HTTP_X_FORWARDED_HOST`
   - `HTTP_X_FORWARDED_FOR`
   - `HTTP_X_ORIGINAL_URI`
6. Click **OK**

---

### Step 10: Test Your Deployment

1. **Check PM2 Status**:
   ```powershell
   pm2 status
   ```
   Should show `algomhoria-admin` as "online"

2. **Check PM2 Logs**:
   ```powershell
   pm2 logs algomhoria-admin
   ```
   Should show the server is running and listening on port 3000

3. **Test Direct Node.js Access** (optional):
   - Open browser: `http://localhost:3000`
   - Should show your Next.js app

4. **Test Through IIS**:
   - Open browser: `http://your-server-ip` or `http://your-domain.com`
   - Should show your Next.js app

---

### Step 11: Configure SSL/HTTPS (Optional but Recommended)

#### 11.1 Obtain SSL Certificate

- Use **Let's Encrypt** (free) with [win-acme](https://www.win-acme.com/)
- Or purchase from a Certificate Authority
- Or use IIS's self-signed certificate for testing

#### 11.2 Bind SSL Certificate in IIS

1. Select your site in IIS Manager
2. Click **Bindings** → **Add**
3. Configure:
   - **Type**: https
   - **Port**: 443
   - **SSL certificate**: Select your certificate
   - **Host name**: your-domain.com

#### 11.3 Enable HTTPS Redirect

Uncomment the HTTPS redirect rule in `web.config` (see Step 9).

---

## PM2 Management Commands

```powershell
# View status
pm2 status

# View logs
pm2 logs algomhoria-admin

# View logs (last 50 lines)
pm2 logs algomhoria-admin --lines 50

# Restart application
pm2 restart algomhoria-admin

# Stop application
pm2 stop algomhoria-admin

# Delete from PM2
pm2 delete algomhoria-admin

# Monitor (real-time)
pm2 monit

# Save current process list
pm2 save

# Reload application (zero-downtime)
pm2 reload algomhoria-admin
```

---

## Updating Your Application

When you need to update your application:

```powershell
# 1. Stop the application
pm2 stop algomhoria-admin

# 2. Backup current version (optional but recommended)
Copy-Item -Path "C:\inetpub\wwwroot\algomhoria-admin" -Destination "C:\inetpub\wwwroot\algomhoria-admin-backup" -Recurse

# 3. Copy new build files to server
# (Copy .next folder, public folder, package.json, .env.production)

# 4. Restart the application
pm2 restart algomhoria-admin

# 5. Check logs to ensure it started correctly
pm2 logs algomhoria-admin --lines 20
```

---

## Troubleshooting

### Application Not Starting

1. **Check PM2 Status**:
   ```powershell
   pm2 status
   pm2 logs algomhoria-admin
   ```

2. **Check Node.js Installation**:
   ```powershell
   node --version
   ```

3. **Check Port Availability**:
   ```powershell
   netstat -ano | findstr :3000
   ```
   If port is in use, change the port in your `.env.production`:
   ```env
   PORT=3001
   ```
   Then update `web.config` to use port 3001.

### 502 Bad Gateway Error

- **PM2 not running**: Check `pm2 status` and restart if needed
- **Wrong port**: Verify port in `web.config` matches PM2 port
- **Node.js process crashed**: Check `pm2 logs algomhoria-admin` for errors

### 404 Not Found

- **Check URL Rewrite**: Ensure ARR proxy is enabled
- **Check web.config**: Verify rewrite rules are correct
- **Check PM2 logs**: Ensure Next.js is running

### Static Files Not Loading

- **Check .next/static folder**: Ensure it's copied to server
- **Check file permissions**: IIS_IUSRS needs read access
- **Check web.config**: Ensure `.next` is in hidden segments

### Environment Variables Not Working

- **Check .env.production**: Ensure file exists and has correct values
- **Restart PM2**: After changing .env.production, restart:
  ```powershell
  pm2 restart algomhoria-admin
  ```

### Performance Issues

1. **Enable compression in IIS**:
   - IIS Manager → Site → Compression
   - Enable dynamic and static compression

2. **Monitor PM2**:
   ```powershell
   pm2 monit
   ```

3. **Check server resources**:
   - Task Manager → Performance tab

---

## Quick Reference Checklist

- [ ] Node.js 18+ installed
- [ ] IIS installed and configured
- [ ] URL Rewrite Module installed
- [ ] Application Request Routing (ARR) installed
- [ ] ARR proxy enabled
- [ ] Application built (`npm run build`)
- [ ] Files copied to server
- [ ] `.env.production` created with correct values
- [ ] PM2 installed and configured
- [ ] Next.js application started with PM2
- [ ] IIS website created
- [ ] `web.config` created with reverse proxy rules
- [ ] Server variables allowed in URL Rewrite
- [ ] Application tested and working
- [ ] SSL certificate installed (if using HTTPS)
- [ ] PM2 configured to start on boot

---

## Summary

This deployment method:
- ✅ Runs Next.js as a standard Node.js process
- ✅ Uses IIS as a reverse proxy (no iisnode needed)
- ✅ Uses PM2 for process management
- ✅ Provides better performance and easier debugging
- ✅ Follows standard Node.js deployment practices

Your Next.js application runs independently, and IIS simply forwards requests to it. This is the recommended approach for production deployments.

---

**Need Help?** Check the troubleshooting section or review PM2 and IIS logs for specific error messages.

