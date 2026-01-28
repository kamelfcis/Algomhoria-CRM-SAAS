# Publish Your Application on a Domain

## Overview

This guide will help you configure your Next.js application to be accessible via your domain name instead of just an IP address.

---

## Prerequisites

- ✅ Your application is running on the VPS (PM2 shows `online`)
- ✅ IIS is configured and working
- ✅ You have a domain name
- ✅ You have access to your domain's DNS settings

---

## Step 1: Get Your VPS IP Address

```powershell
# On your VPS, run:
ipconfig

# Look for "IPv4 Address" under your network adapter
# Example: 192.168.1.100 or 45.67.89.123
```

**Write down this IP address** - you'll need it for DNS configuration.

---

## Step 2: Configure DNS Records

You need to point your domain to your VPS IP address.

### Option A: Point Root Domain (example.com)

1. Log in to your **domain registrar** or **DNS provider** (GoDaddy, Namecheap, Cloudflare, etc.)
2. Go to **DNS Management** or **DNS Settings**
3. Find the **A Record** for your root domain (or create one)
4. Set:
   - **Type:** `A`
   - **Name/Host:** `@` or leave blank (depends on provider)
   - **Value/Points to:** `YOUR_VPS_IP_ADDRESS`
   - **TTL:** `3600` (or default)

**Example:**
```
Type: A
Name: @
Value: 45.67.89.123
TTL: 3600
```

### Option B: Point Subdomain (admin.example.com)

1. Log in to your DNS provider
2. Create a new **A Record**:
   - **Type:** `A`
   - **Name/Host:** `admin` (or `www`, `app`, etc.)
   - **Value/Points to:** `YOUR_VPS_IP_ADDRESS`
   - **TTL:** `3600`

**Example:**
```
Type: A
Name: admin
Value: 45.67.89.123
TTL: 3600
```

### DNS Propagation

- DNS changes can take **5 minutes to 48 hours** to propagate
- Usually takes **15-30 minutes**
- You can check propagation status at: https://www.whatsmydns.net/

---

## Step 3: Configure IIS Site Binding

### 3.1 Open IIS Manager

1. Press `Windows + R`
2. Type: `inetmgr`
3. Press Enter

### 3.2 Configure Site Binding

1. Expand **Sites** in the left panel
2. Click on **`algomhoria-admin`** (or your site name)
3. Click **Bindings...** in the right panel (or right-click → **Edit Bindings**)
4. Click **Add...**
5. Configure:
   - **Type:** `http`
   - **IP address:** `All Unassigned` (or select specific IP)
   - **Port:** `80`
   - **Host name:** `your-domain.com` (or `admin.your-domain.com`)
6. Click **OK**
7. Click **Close**

**Example:**
- If your domain is `example.com` → Host name: `example.com`
- If using subdomain `admin.example.com` → Host name: `admin.example.com`

### 3.3 Multiple Bindings (Optional)

You can add multiple bindings:
- `example.com` (root domain)
- `www.example.com` (www subdomain)
- `admin.example.com` (admin subdomain)

Just add separate bindings for each.

---

## Step 4: Update Environment Variables (If Needed)

If your application uses environment variables that reference the domain:

```powershell
# Edit .env.production
notepad C:\inetpub\wwwroot\algomhoria-admin\.env.production
```

**Add or update:**
```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
# Or
NEXT_PUBLIC_APP_URL=https://admin.your-domain.com
```

**After updating, restart PM2:**
```powershell
pm2 restart algomhoria-admin
```

---

## Step 5: Configure Windows Firewall

Make sure port 80 (HTTP) is open:

```powershell
# Allow HTTP (Port 80)
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow

# Verify rule exists
Get-NetFirewallRule -DisplayName "HTTP"
```

**If using a cloud provider (Azure, AWS, DigitalOcean, etc.):**
- Also configure their firewall/security group
- Allow inbound traffic on port 80 (HTTP) and 443 (HTTPS)

---

## Step 6: Test Domain Access

### 6.1 Wait for DNS Propagation

Wait at least **15-30 minutes** after updating DNS, then test:

```powershell
# Test DNS resolution
nslookup your-domain.com

# Or
ping your-domain.com
```

**Expected:** Should return your VPS IP address

### 6.2 Test in Browser

1. Open a browser (on your local machine or VPS)
2. Navigate to: `http://your-domain.com`
3. Or: `http://admin.your-domain.com` (if using subdomain)

**Expected:** Your application should load

### 6.3 Test from External Network

Test from a different network (or use your phone's mobile data) to ensure it's accessible publicly.

---

## Step 7: Set Up SSL/HTTPS (Recommended)

For production, you should use HTTPS. Here's how to set it up:

### Option A: Let's Encrypt (Free SSL)

#### 7.1 Install Win-ACME (Windows ACME Simple)

1. Download from: https://www.win-acme.com/
2. Extract to a folder (e.g., `C:\win-acme`)
3. Run as Administrator: `wacs.exe`

#### 7.2 Generate Certificate

1. Run `wacs.exe` as Administrator
2. Follow the prompts:
   - Select your site: `algomhoria-admin`
   - Enter your domain: `your-domain.com`
   - Choose validation method (HTTP-01 is easiest)
   - Choose installation method (IIS)
3. The tool will automatically:
   - Generate the certificate
   - Install it in IIS
   - Configure HTTPS binding
   - Set up auto-renewal

#### 7.3 Verify HTTPS Binding

1. Open IIS Manager
2. Sites → `algomhoria-admin` → Bindings
3. You should see:
   - `http` on port 80
   - `https` on port 443

### Option B: Commercial SSL Certificate

If you have a commercial SSL certificate:

1. **Import Certificate:**
   - Open IIS Manager
   - Click on your **server name** (top level)
   - Double-click **Server Certificates**
   - Click **Import...** (right panel)
   - Select your certificate file (.pfx)
   - Enter password
   - Click **OK**

2. **Add HTTPS Binding:**
   - Sites → `algomhoria-admin` → Bindings
   - Click **Add...**
   - **Type:** `https`
   - **Port:** `443`
   - **Host name:** `your-domain.com`
   - **SSL certificate:** Select your imported certificate
   - Click **OK**

### 7.4 Redirect HTTP to HTTPS (Optional but Recommended)

1. Install **URL Rewrite Module** (if not already installed)
2. Open IIS Manager
3. Sites → `algomhoria-admin`
4. Double-click **URL Rewrite**
5. Click **Add Rule...** (right panel)
6. Select **Blank rule**
7. Configure:
   - **Name:** `Redirect HTTP to HTTPS`
   - **Match URL:**
     - **Requested URL:** `Matches the Pattern`
     - **Using:** `Wildcards`
     - **Pattern:** `*`
   - **Conditions:**
     - Click **Add...**
     - **Condition input:** `{HTTPS}`
     - **Check if input string:** `Matches the Pattern`
     - **Pattern:** `^OFF$`
   - **Action:**
     - **Action type:** `Redirect`
     - **Redirect URL:** `https://{HTTP_HOST}{REQUEST_URI}`
     - **Redirect type:** `Permanent (301)`
8. Click **Apply**

---

## Step 8: Update web.config for HTTPS (If Using HTTPS)

If you set up HTTPS, you may need to update `web.config` to handle HTTPS properly. The current `web.config` should work, but you can verify the reverse proxy rules are correct.

---

## Step 9: Restart Services

After all configuration:

```powershell
# Restart PM2
pm2 restart algomhoria-admin

# Restart IIS (optional, usually not needed)
iisreset
```

---

## Step 10: Verify Everything Works

### ✅ Final Checklist:

- [ ] DNS A record points to VPS IP
- [ ] DNS propagated (checked with nslookup)
- [ ] IIS site binding configured with domain name
- [ ] Port 80 open in Windows Firewall
- [ ] Port 80 open in cloud provider firewall (if applicable)
- [ ] Can access `http://your-domain.com` from browser
- [ ] SSL certificate installed (if using HTTPS)
- [ ] Can access `https://your-domain.com` (if using HTTPS)
- [ ] HTTP redirects to HTTPS (if configured)
- [ ] Application loads correctly
- [ ] Login works
- [ ] All features work

---

## Troubleshooting

### Issue: Domain doesn't resolve

**Solution:**
1. Check DNS records are correct
2. Wait longer for DNS propagation (can take up to 48 hours)
3. Check DNS propagation status: https://www.whatsmydns.net/
4. Try from different network/DNS server

### Issue: "This site can't be reached"

**Solutions:**
1. Verify DNS points to correct IP: `nslookup your-domain.com`
2. Check Windows Firewall allows port 80
3. Check cloud provider firewall
4. Verify IIS site is **Started**
5. Check IIS binding has correct host name

### Issue: "Default IIS page" shows instead of your app

**Solutions:**
1. Verify IIS site binding has your domain in **Host name**
2. Make sure you're accessing the correct site
3. Check `web.config` exists and is correct
4. Verify PM2 is running: `pm2 status`

### Issue: 502 Bad Gateway

**Solutions:**
1. Check PM2 is running: `pm2 status`
2. Check PM2 logs: `pm2 logs algomhoria-admin`
3. Verify app is on port 3000: `netstat -ano | findstr :3000`
4. Restart PM2: `pm2 restart algomhoria-admin`

### Issue: SSL Certificate errors

**Solutions:**
1. Verify certificate is valid and not expired
2. Check certificate is bound to correct domain
3. Ensure certificate is installed in IIS
4. Verify HTTPS binding is configured correctly

---

## Quick Command Summary

```powershell
# 1. Get VPS IP
ipconfig

# 2. Configure DNS (in your domain provider's panel)
# Add A record: your-domain.com → YOUR_VPS_IP

# 3. Configure IIS binding (in IIS Manager)
# Sites → algomhoria-admin → Bindings → Add → Host: your-domain.com

# 4. Open firewall
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow

# 5. Test DNS
nslookup your-domain.com

# 6. Restart services
pm2 restart algomhoria-admin

# 7. Test in browser
# http://your-domain.com
```

---

## Example Configuration

**Domain:** `admin.example.com`
**VPS IP:** `45.67.89.123`

**DNS Record:**
```
Type: A
Name: admin
Value: 45.67.89.123
TTL: 3600
```

**IIS Binding:**
```
Type: http
IP: All Unassigned
Port: 80
Host: admin.example.com
```

**Access URL:**
```
http://admin.example.com
```

---

## Next Steps After Domain Setup

1. **Monitor application:**
   - `pm2 monit` - Monitor PM2
   - IIS logs - Monitor web requests

2. **Set up monitoring:**
   - Uptime monitoring (UptimeRobot, Pingdom)
   - Error tracking (Sentry, LogRocket)

3. **Backup strategy:**
   - Database backups
   - File backups
   - Configuration backups

4. **Performance optimization:**
   - CDN for static assets
   - Database query optimization
   - Caching strategies

---

**Your application should now be accessible via your domain!** 🎉

