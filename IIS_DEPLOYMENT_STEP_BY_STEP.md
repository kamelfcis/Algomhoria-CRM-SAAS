# 🚀 Step-by-Step: Deploy Next.js to IIS on VPS

## Prerequisites

- ✅ Windows Server VPS with IIS installed
- ✅ Node.js 18+ installed on VPS
- ✅ PM2 installed globally (`npm install -g pm2`)
- ✅ Your Next.js app built and ready
- ✅ Domain name or IP address pointing to your VPS

## Step 1: Prepare Your Application

### 1.1 Build Your Application Locally (or on VPS)

```bash
# Navigate to your project directory
cd D:\gomhoria

# Install dependencies (if not already done)
npm install

# Build the application
npm run build
```

**Expected Output:**
- `.next` folder created
- `standalone` folder created (if configured in `next.config.js`)

### 1.2 Verify Build Success

Check that the build completed without errors. You should see:
```
✓ Compiled successfully
✓ Linting and checking validity of types
```

## Step 2: Transfer Files to VPS

### Option A: Using Remote Desktop (RDP)

1. **Connect to your VPS** via Remote Desktop
2. **Copy your project folder** to the VPS (e.g., `C:\inetpub\gomhoria`)
3. **Or use File Transfer**:
   - Compress your project folder (excluding `node_modules` and `.next`)
   - Transfer via RDP or FTP
   - Extract on VPS

### Option B: Using Git (Recommended)

```bash
# On VPS, clone your repository
cd C:\inetpub
git clone <your-repository-url> gomhoria
cd gomhoria

# Install dependencies
npm install --production

# Build the application
npm run build
```

### Option C: Using FTP/SFTP

1. Use FileZilla or WinSCP to transfer files
2. Upload entire project folder to `C:\inetpub\gomhoria`
3. Exclude: `node_modules`, `.next` (will rebuild on server)

## Step 3: Install Dependencies on VPS

```powershell
# Open PowerShell as Administrator on VPS
cd C:\inetpub\gomhoria

# Install Node.js dependencies
npm install --production

# Install PM2 globally (if not already installed)
npm install -g pm2

# Build the application (if not already built)
npm run build
```

## Step 4: Configure Environment Variables

### 4.1 Create `.env.local` File

```powershell
# Navigate to project directory
cd C:\inetpub\gomhoria

# Create .env.local file
notepad .env.local
```

### 4.2 Add Your Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
NODE_ENV=production
```

**Important:** Replace with your actual values!

### 4.3 Save and Close

Press `Ctrl+S` to save, then close Notepad.

## Step 5: Install and Configure IIS

### 5.1 Install IIS (if not installed)

```powershell
# Run PowerShell as Administrator
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer
Enable-WindowsOptionalFeature -Online -FeatureName IIS-CommonHttpFeatures
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpErrors
Enable-WindowsOptionalFeature -Online -FeatureName IIS-ApplicationInit
Enable-WindowsOptionalFeature -Online -FeatureName IIS-NetFxExtensibility45
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HealthAndDiagnostics
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpLogging
Enable-WindowsOptionalFeature -Online -FeatureName IIS-Security
Enable-WindowsOptionalFeature -Online -FeatureName IIS-RequestFiltering
Enable-WindowsOptionalFeature -Online -FeatureName IIS-Performance
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpCompressionStatic
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpCompressionDynamic
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerManagementTools
Enable-WindowsOptionalFeature -Online -FeatureName IIS-ManagementConsole
Enable-WindowsOptionalFeature -Online -FeatureName IIS-IIS6ManagementCompatibility
Enable-WindowsOptionalFeature -Online -FeatureName IIS-Metabase
```

### 5.2 Install URL Rewrite Module

1. Download from: https://www.iis.net/downloads/microsoft/url-rewrite
2. Install the downloaded `.msi` file
3. Restart IIS: `iisreset`

### 5.3 Install Application Request Routing (ARR)

1. Download from: https://www.iis.net/downloads/microsoft/application-request-routing
2. Install the downloaded `.msi` file
3. Restart IIS: `iisreset`

## Step 6: Create IIS Website

### 6.1 Open IIS Manager

1. Press `Win + R`
2. Type `inetmgr` and press Enter

### 6.2 Create New Website

1. **Right-click** on "Sites" → **Add Website**
2. Fill in the details:
   - **Site name**: `gomhoria` (or your preferred name)
   - **Application pool**: Create new (will be created automatically)
   - **Physical path**: `C:\inetpub\gomhoria\public` (or create a public folder)
   - **Binding**:
     - **Type**: `http` or `https`
     - **IP address**: `All Unassigned` or your specific IP
     - **Port**: `80` (or `443` for HTTPS)
     - **Host name**: Your domain name (e.g., `admin.yourdomain.com`) or leave blank

3. Click **OK**

### 6.3 Configure Application Pool

1. Expand **Application Pools**
2. Find your app pool (e.g., `gomhoria`)
3. **Right-click** → **Advanced Settings**
4. Set:
   - **.NET CLR Version**: `No Managed Code`
   - **Managed Pipeline Mode**: `Integrated`
   - **Start Mode**: `AlwaysRunning`
   - **Idle Timeout**: `0` (or set to your preference)

## Step 7: Configure web.config

### 7.1 Create web.config File

```powershell
# Navigate to project directory
cd C:\inetpub\gomhoria

# Create web.config file
notepad web.config
```

### 7.2 Add web.config Content

Copy and paste this configuration:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- Handle Next.js static files -->
        <rule name="Static Files" stopProcessing="true">
          <match url="^(_next|static|.*\..+)$" />
          <action type="Rewrite" url="{R:0}" />
        </rule>
        
        <!-- Handle Next.js API routes -->
        <rule name="API Routes" stopProcessing="true">
          <match url="^api/(.*)$" />
          <action type="Rewrite" url="http://localhost:3000/api/{R:1}" />
        </rule>
        
        <!-- Handle all other requests (reverse proxy to Node.js) -->
        <rule name="Next.js" stopProcessing="true">
          <match url="(.*)" />
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
          </conditions>
          <action type="Rewrite" url="http://localhost:3000/{R:1}" />
        </rule>
      </rules>
    </rewrite>
    
    <!-- Security headers -->
    <httpProtocol>
      <customHeaders>
        <remove name="X-Powered-By" />
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="DENY" />
        <add name="X-XSS-Protection" value="1; mode=block" />
      </customHeaders>
    </httpProtocol>
    
    <!-- Compression -->
    <urlCompression doStaticCompression="true" doDynamicCompression="true" />
    
    <!-- Default documents -->
    <defaultDocument>
      <files>
        <clear />
      </files>
    </defaultDocument>
  </system.webServer>
</configuration>
```

### 7.3 Save web.config

Press `Ctrl+S` to save, then close Notepad.

**Important:** Place `web.config` in the root of your project (`C:\inetpub\gomhoria\web.config`)

## Step 8: Start Next.js Application with PM2

### 8.1 Create PM2 Ecosystem File (Optional but Recommended)

```powershell
# Create ecosystem.config.js
notepad ecosystem.config.js
```

Add this content:

```javascript
module.exports = {
  apps: [{
    name: 'gomhoria',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: 'C:\\inetpub\\gomhoria',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'C:\\inetpub\\gomhoria\\logs\\pm2-error.log',
    out_file: 'C:\\inetpub\\gomhoria\\logs\\pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
}
```

Save and close.

### 8.2 Create Logs Directory

```powershell
mkdir C:\inetpub\gomhoria\logs
```

### 8.3 Start Application with PM2

```powershell
# Navigate to project directory
cd C:\inetpub\gomhoria

# Start the application
pm2 start ecosystem.config.js

# Or start directly:
pm2 start npm --name "gomhoria" -- start

# Save PM2 configuration (so it starts on server restart)
pm2 save

# Setup PM2 to start on Windows boot
pm2 startup
```

**Note:** When running `pm2 startup`, it will give you a command to run as Administrator. Copy and run that command.

### 8.4 Verify PM2 is Running

```powershell
# Check status
pm2 status

# View logs
pm2 logs gomhoria

# Monitor
pm2 monit
```

You should see your application running on port 3000.

## Step 9: Test the Application

### 9.1 Test Locally on VPS

1. Open browser on VPS
2. Navigate to: `http://localhost:3000`
3. Verify the application loads correctly

### 9.2 Test via IIS

1. Open browser on VPS
2. Navigate to: `http://localhost` (or your domain/IP)
3. Verify the application loads correctly

### 9.3 Test from External Network

1. Open browser on your local machine
2. Navigate to: `http://your-vps-ip` (or your domain)
3. Verify the application loads correctly

## Step 10: Configure Firewall (if needed)

### 10.1 Allow Port 80 (HTTP)

```powershell
# Run PowerShell as Administrator
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
```

### 10.2 Allow Port 443 (HTTPS - if using SSL)

```powershell
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow
```

### 10.3 Allow Port 3000 (for testing - optional)

```powershell
New-NetFirewallRule -DisplayName "Node.js App" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

## Step 11: Configure SSL/HTTPS (Optional but Recommended)

### 11.1 Install SSL Certificate

1. Obtain SSL certificate (Let's Encrypt, or purchased)
2. In IIS Manager, select your website
3. Click **Bindings** → **Add**
4. Select **https**, port **443**
5. Select your SSL certificate
6. Click **OK**

### 11.2 Redirect HTTP to HTTPS

Update `web.config` to include HTTP to HTTPS redirect:

```xml
<rule name="HTTP to HTTPS redirect" stopProcessing="true">
  <match url="(.*)" />
  <conditions>
    <add input="{HTTPS}" pattern="off" ignoreCase="true" />
  </conditions>
  <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
</rule>
```

## Step 12: Verify Everything Works

### 12.1 Check PM2 Status

```powershell
pm2 status
pm2 logs gomhoria --lines 50
```

### 12.2 Check IIS Status

1. Open IIS Manager
2. Check that your website is **Started**
3. Check **Worker Processes** to see if requests are being processed

### 12.3 Test All Features

- ✅ Login page loads
- ✅ Dashboard loads
- ✅ API routes work
- ✅ Database connections work
- ✅ Images load correctly

## Troubleshooting

### Issue: Application not starting

**Solution:**
```powershell
# Check PM2 logs
pm2 logs gomhoria --lines 100

# Check if port 3000 is in use
netstat -ano | findstr :3000

# Restart PM2
pm2 restart gomhoria
```

### Issue: 502 Bad Gateway

**Solution:**
1. Verify PM2 is running: `pm2 status`
2. Verify Node.js app is listening on port 3000
3. Check IIS Application Pool is started
4. Check `web.config` reverse proxy configuration

### Issue: Static files not loading

**Solution:**
1. Verify `.next` folder exists
2. Check `web.config` static file rules
3. Verify file permissions in IIS

### Issue: Environment variables not working

**Solution:**
1. Verify `.env.local` file exists
2. Check file is in correct location
3. Restart PM2: `pm2 restart gomhoria`

### Issue: Database connection errors

**Solution:**
1. Verify environment variables are set correctly
2. Check Supabase URL and keys
3. Verify firewall allows outbound connections
4. Check Supabase dashboard for connection issues

## Maintenance Commands

### Restart Application

```powershell
pm2 restart gomhoria
```

### Stop Application

```powershell
pm2 stop gomhoria
```

### View Logs

```powershell
pm2 logs gomhoria
```

### Update Application

```powershell
cd C:\inetpub\gomhoria
git pull  # If using Git
npm install --production
npm run build
pm2 restart gomhoria
```

### Check Application Status

```powershell
pm2 status
pm2 monit
```

## Security Checklist

- [ ] Firewall configured correctly
- [ ] SSL certificate installed (HTTPS)
- [ ] Environment variables secured
- [ ] IIS security headers configured
- [ ] Regular backups configured
- [ ] PM2 process monitoring enabled
- [ ] Logs directory secured
- [ ] Database credentials secured

## Summary

Your Next.js application should now be:
- ✅ Running on IIS via reverse proxy
- ✅ Accessible via HTTP/HTTPS
- ✅ Managed by PM2 (auto-restart on failure)
- ✅ Configured to start on server boot
- ✅ Production-ready

**Access your application at:** `http://your-vps-ip` or `https://your-domain.com`

---

**Need Help?** Check the troubleshooting section or review the logs:
- PM2 logs: `pm2 logs gomhoria`
- IIS logs: `C:\inetpub\logs\LogFiles\`

