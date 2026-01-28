# IIS Deployment Guide for Next.js Application

This guide will walk you through deploying your Next.js application on Windows IIS Server.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [Next.js Configuration](#nextjs-configuration)
4. [Building the Application](#building-the-application)
5. [IIS Configuration](#iis-configuration)
6. [Environment Variables](#environment-variables)
7. [Process Management](#process-management)
8. [SSL/HTTPS Setup](#sslhttps-setup)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### 1. Install Node.js
- Download and install **Node.js 18.x or higher** from [nodejs.org](https://nodejs.org/)
- Choose the **LTS (Long Term Support)** version
- During installation, ensure "Add to PATH" is checked
- Verify installation:
  ```powershell
  node --version
  npm --version
  ```

### 2. Install IIS (if not already installed)
1. Open **Server Manager** or **Control Panel** → **Programs** → **Turn Windows features on or off**
2. Enable:
   - **Internet Information Services (IIS)**
   - **IIS Management Console**
   - **World Wide Web Services** → **Application Development Features** → **ASP.NET** (if needed)

### 3. Install IIS URL Rewrite Module
- Download from: [Microsoft URL Rewrite Module](https://www.iis.net/downloads/microsoft/url-rewrite)
- Install the module (required for Next.js routing)

### 4. Install Application Request Routing (ARR) - Optional but Recommended
- Download from: [Microsoft ARR](https://www.iis.net/downloads/microsoft/application-request-routing)
- This is useful if you want to use IIS as a reverse proxy

---

## Server Setup

### Option A: Using iisnode (Recommended for Direct Node.js Hosting)

#### 1. Install iisnode
- Download from: [iisnode GitHub Releases](https://github.com/Azure/iisnode/releases)
- Install the appropriate version (x64 for 64-bit Windows)

#### 2. Verify iisnode Installation
- Open IIS Manager
- You should see "iisnode" in the Features View

### Option B: Using Reverse Proxy (Recommended for Production)

This approach runs Next.js as a standalone Node.js process and uses IIS as a reverse proxy.

---

## Next.js Configuration

Update your `next.config.js` to enable standalone output:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enable standalone output for easier deployment
}

module.exports = nextConfig
```

**Note**: The standalone output creates a minimal server.js file and copies only necessary files, making deployment easier.

---

## Building the Application

### 1. Prepare Your Project

On your development machine or build server:

```powershell
# Navigate to your project directory
cd D:\gomhoria

# Install dependencies (if not already done)
npm install

# Create production build
npm run build
```

This will create:
- `.next/standalone/` - Minimal server files
- `.next/static/` - Static assets
- `.next/BUILD_ID` - Build identifier

### 2. Prepare Deployment Package

Copy the following to your IIS server:

```
Required Files:
├── .next/
│   ├── standalone/          # Copy entire folder
│   ├── static/              # Copy entire folder
│   └── BUILD_ID             # Copy file
├── public/                  # Copy entire folder (if exists)
├── node_modules/           # Only production dependencies
│   └── (only necessary packages)
├── package.json
└── web.config              # IIS configuration (create this)
```

**Recommended**: Use the standalone output which includes only necessary files.

---

## IIS Configuration

### Method 1: Using iisnode (Direct Node.js Hosting)

#### 1. Create IIS Application

1. Open **IIS Manager**
2. Right-click on **Sites** → **Add Website**
3. Configure:
   - **Site name**: `algomhoria-admin` (or your preferred name)
   - **Application pool**: Create new (or select existing)
   - **Physical path**: `C:\inetpub\wwwroot\algomhoria-admin` (or your deployment path)
   - **Binding**: 
     - **Type**: http or https
     - **IP address**: All Unassigned (or specific IP)
     - **Port**: 80 (or 443 for HTTPS)
     - **Host name**: your-domain.com (optional)

#### 2. Configure Application Pool

1. Select your **Application Pool**
2. Right-click → **Advanced Settings**
3. Configure:
   - **.NET CLR Version**: No Managed Code
   - **Managed Pipeline Mode**: Integrated
   - **Start Mode**: AlwaysRunning (recommended)
   - **Idle Time-out**: 0 (to prevent app from stopping)

#### 3. Create web.config

Create `web.config` in your application root:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="server.js" verb="*" modules="iisnode"/>
    </handlers>
    
    <rewrite>
      <rules>
        <!-- Don't interfere with requests for node-inspector debugging -->
        <rule name="NodeInspector" patternSyntax="ECMAScript" stopProcessing="true">
          <match url="^server.js\/debug[\/]?" />
        </rule>

        <!-- First we consider whether the incoming URL matches a physical file in the /public folder -->
        <rule name="StaticContent">
          <action type="Rewrite" url="public{REQUEST_URI}"/>
        </rule>

        <!-- All other URLs are mapped to the Node.js application entry point -->
        <rule name="DynamicContent">
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True"/>
          </conditions>
          <action type="Rewrite" url="server.js"/>
        </rule>
      </rules>
    </rewrite>

    <!-- 'bin' directory has no special meaning in node.js and apps can be placed in it -->
    <security>
      <requestFiltering>
        <hiddenSegments>
          <remove segment="bin"/>
        </hiddenSegments>
      </requestFiltering>
    </security>

    <!-- Make sure error responses are left untouched -->
    <httpErrors existingResponse="PassThrough" />

    <!-- You can control how Node is hosted within IIS using the following options:
      * watchedFiles: semi-colon separated list of files that will be watched for changes to restart the server
      * node_env: will be propagated to node as NODE_ENV environment variable
      * debuggingEnabled - controls whether the built-in debugger is enabled
      * logDirectory: directory where iisnode logs will be written
      * debugHeaderEnabled: whether to send X-iisnode-debug header
      * debuggerPortRange: range of ports for the debugger
      * maxLogFileSizeInKB: max size of log files (defaults to 128KB)
      * maxTotalLogFileSizeInKB: max size of all log files combined (defaults to 1024KB)
      * maxLogFiles: max number of log files (defaults to 20)
      * devErrorsEnabled: whether developer errors should be shown
      * flushResponse: whether to flush response on write
      * enableXFF: whether to trust X-Forwarded-For header
      * promoteServerVars: comma separated list of server variables to promote to node
    -->
    <iisnode
      node_env="production"
      nodeProcessCountPerApplication="1"
      maxConcurrentRequestsPerProcess="1024"
      maxNamedPipeConnectionRetry="100"
      namedPipeConnectionRetryDelay="250"
      maxNamedPipeConnectionPoolSize="512"
      maxNamedPipePooledConnectionAge="30000"
      asyncCompletionThreadCount="0"
      initialRequestBufferSize="4096"
      maxRequestBufferSize="65536"
      watchedFiles="*.js;iisnode.yml"
      uncFileChangesPollingInterval="5000"
      gracefulShutdownTimeout="60000"
      loggingEnabled="true"
      logDirectory="iisnode"
      debuggingEnabled="false"
      debugHeaderEnabled="false"
      debuggerPortRange="5058-6058"
      debuggerPathSegment="debug"
      maxLogFileSizeInKB="128"
      maxTotalLogFileSizeInKB="1024"
      maxLogFiles="20"
      devErrorsEnabled="false"
      flushResponse="false"
      enableXFF="false"
      configOverrides="iisnode.yml"
      />
  </system.webServer>
</configuration>
```

#### 4. Update server.js Path

If using standalone build, the server file is at `.next/standalone/server.js`. Update web.config:

```xml
<add name="iisnode" path=".next/standalone/server.js" verb="*" modules="iisnode"/>
```

And update the rewrite rule:

```xml
<action type="Rewrite" url=".next/standalone/server.js"/>
```

### Method 2: Using Reverse Proxy (Recommended for Production)

This method runs Next.js as a Windows Service or using PM2, and IIS acts as a reverse proxy.

#### 1. Install and Configure PM2

On your server:

```powershell
# Install PM2 globally
npm install -g pm2
npm install -g pm2-windows-startup

# Configure PM2 to start on Windows boot
pm2-startup install
```

#### 2. Start Your Next.js Application

```powershell
# Navigate to your application directory
cd C:\inetpub\wwwroot\algomhoria-admin

# Start the application with PM2
pm2 start .next/standalone/server.js --name "algomhoria-admin" --interpreter node

# Save PM2 configuration
pm2 save
```

#### 3. Configure IIS as Reverse Proxy

1. Enable **Application Request Routing (ARR)** in IIS
2. Enable **Proxy** in ARR settings
3. Create `web.config`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyInboundRule" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:3000/{R:1}" />
          <serverVariables>
            <set name="HTTP_X_FORWARDED_PROTO" value="https" />
            <set name="HTTP_X_FORWARDED_HOST" value="{HTTP_HOST}" />
            <set name="HTTP_X_FORWARDED_FOR" value="{REMOTE_ADDR}" />
          </serverVariables>
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

**Note**: Change `localhost:3000` to your actual Next.js server port if different.

---

## Environment Variables

### Option 1: Using web.config (Not Recommended for Secrets)

Add to `web.config` inside `<system.webServer>`:

```xml
<aspNetCore>
  <environmentVariables>
    <environmentVariable name="NODE_ENV" value="production" />
    <environmentVariable name="NEXT_PUBLIC_SUPABASE_URL" value="your_supabase_url" />
    <environmentVariable name="NEXT_PUBLIC_SUPABASE_ANON_KEY" value="your_anon_key" />
    <environmentVariable name="NEXT_PUBLIC_APP_URL" value="https://your-domain.com" />
  </environmentVariables>
</aspNetCore>
```

### Option 2: Using .env.production (Recommended)

Create `.env.production` in your application root:

```env
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=https://your-domain.com
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

**Security Note**: Ensure `.env.production` is not accessible via web. Add to `web.config`:

```xml
<security>
  <requestFiltering>
    <hiddenSegments>
      <add segment=".env.production" />
      <add segment=".env.local" />
    </hiddenSegments>
  </requestFiltering>
</security>
```

### Option 3: Using Windows Environment Variables (Most Secure)

1. Open **System Properties** → **Environment Variables**
2. Add system-level environment variables
3. Restart IIS after adding variables:
   ```powershell
   iisreset
   ```

---

## Process Management

### Using PM2 (Recommended)

```powershell
# Start application
pm2 start .next/standalone/server.js --name "algomhoria-admin"

# View status
pm2 status

# View logs
pm2 logs algomhoria-admin

# Restart application
pm2 restart algomhoria-admin

# Stop application
pm2 stop algomhoria-admin

# Delete from PM2
pm2 delete algomhoria-admin

# Monitor
pm2 monit
```

### Using Windows Service (Alternative)

You can use `node-windows` or `pm2-windows-service` to run as a Windows Service:

```powershell
npm install -g node-windows
# Or
npm install -g pm2-windows-service
```

---

## SSL/HTTPS Setup

### 1. Obtain SSL Certificate

- Use **Let's Encrypt** (free) with [win-acme](https://www.win-acme.com/)
- Or purchase from a Certificate Authority
- Or use IIS's self-signed certificate for testing

### 2. Bind SSL Certificate in IIS

1. Select your site in IIS Manager
2. Click **Bindings** → **Add**
3. Configure:
   - **Type**: https
   - **Port**: 443
   - **SSL certificate**: Select your certificate
   - **Host name**: your-domain.com

### 3. Force HTTPS Redirect

Add to `web.config`:

```xml
<rewrite>
  <rules>
    <rule name="HTTP to HTTPS redirect" stopProcessing="true">
      <match url="(.*)" />
      <conditions>
        <add input="{HTTPS}" pattern="off" ignoreCase="true" />
      </conditions>
      <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
    </rule>
    <!-- Your existing rules here -->
  </rules>
</rewrite>
```

---

## Troubleshooting

### Application Not Starting

1. **Check Node.js Installation**:
   ```powershell
   node --version
   ```

2. **Check Application Pool Status**:
   - IIS Manager → Application Pools → Check if pool is "Started"

3. **Check Event Viewer**:
   - Windows Logs → Application
   - Look for errors related to your application

4. **Check iisnode Logs**:
   - Located in: `C:\inetpub\wwwroot\algomhoria-admin\iisnode\`
   - Check `stderr-*.txt` and `stdout-*.txt` files

### 500 Internal Server Error

1. **Check web.config syntax** - Ensure XML is valid
2. **Check environment variables** - Verify all required variables are set
3. **Check file permissions** - IIS_IUSRS needs read/execute permissions
4. **Check Node.js path** - Verify Node.js is in system PATH

### Static Files Not Loading

1. **Check static folder path** - Ensure `.next/static` is accessible
2. **Check rewrite rules** - Static content rule should come before dynamic rule
3. **Check MIME types** - IIS should handle `.js`, `.css`, `.json` files

### Routing Not Working

1. **Verify URL Rewrite Module** is installed
2. **Check rewrite rules** in web.config
3. **Ensure all routes are handled** by the Node.js server

### Performance Issues

1. **Enable compression** in IIS:
   - IIS Manager → Site → Compression
   - Enable dynamic and static compression

2. **Configure caching**:
   ```xml
   <staticContent>
     <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="365.00:00:00" />
   </staticContent>
   ```

3. **Monitor with PM2**:
   ```powershell
   pm2 monit
   ```

### Debugging

1. **Enable detailed errors** (development only):
   ```xml
   <iisnode devErrorsEnabled="true" />
   ```

2. **Check browser console** for client-side errors

3. **Check server logs**:
   - PM2: `pm2 logs`
   - iisnode: Check log directory
   - IIS: Event Viewer

---

## Quick Deployment Checklist

- [ ] Node.js 18+ installed
- [ ] IIS installed and configured
- [ ] URL Rewrite Module installed
- [ ] iisnode installed (if using Method 1)
- [ ] Application built (`npm run build`)
- [ ] Files copied to IIS directory
- [ ] `web.config` created and configured
- [ ] Environment variables set
- [ ] Application pool configured
- [ ] SSL certificate installed (if using HTTPS)
- [ ] Firewall rules configured (ports 80/443)
- [ ] Application tested and working
- [ ] PM2 configured (if using Method 2)
- [ ] Monitoring set up

---

## Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [iisnode Documentation](https://github.com/Azure/iisnode)
- [IIS URL Rewrite Module](https://www.iis.net/downloads/microsoft/url-rewrite)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review IIS logs and application logs
3. Verify all prerequisites are installed
4. Test with a simple Node.js application first

---

**Last Updated**: 2024

