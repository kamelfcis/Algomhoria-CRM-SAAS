# How to Access Your Frontend

## Your Application is Running! ✅

PM2 shows your app is **online** and running on port **3000**.

---

## Option 1: Access Directly via Node.js (Port 3000)

### On the VPS (Local):
Open your browser on the VPS and go to:
```
http://localhost:3000
```

### From Your Local Machine:
If you want to access from your computer, use:
```
http://YOUR_VPS_IP_ADDRESS:3000
```

**To find your VPS IP:**
```powershell
# On VPS, run:
ipconfig
# Look for IPv4 Address (usually under Ethernet adapter)
```

**Note:** You may need to open port 3000 in the Windows Firewall:
```powershell
New-NetFirewallRule -DisplayName "Node.js App" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

---

## Option 2: Access via IIS (Port 80) - Recommended

IIS acts as a reverse proxy, forwarding requests from port 80 to your Node.js app on port 3000.

### Step 1: Verify IIS Site is Configured

1. Open **IIS Manager**
2. Expand **Sites** in the left panel
3. Look for **`algomhoria-admin`** site
4. Make sure it's **Started** (not stopped)

**If the site doesn't exist, create it:**
1. Right-click **Sites** → **Add Website**
2. **Site name:** `algomhoria-admin`
3. **Physical path:** `C:\inetpub\wwwroot\algomhoria-admin`
4. **Binding:**
   - **Type:** `http`
   - **IP address:** `All Unassigned`
   - **Port:** `80`
   - **Host name:** (leave blank or add your domain)
5. Click **OK**

### Step 2: Verify web.config is in Place

```powershell
# Check if web.config exists
Test-Path C:\inetpub\wwwroot\algomhoria-admin\web.config
```

**Should return:** `True`

**If it doesn't exist:**
- Copy `web.config` from your local project to `C:\inetpub\wwwroot\algomhoria-admin\`

### Step 3: Verify ARR is Enabled

1. Open **IIS Manager**
2. Click on your **server name** (top level, not a site)
3. Double-click **Application Request Routing Cache**
4. Click **Server Proxy Settings** (on the right)
5. Make sure **Enable proxy** is **checked** ✅
6. Click **Apply**

### Step 4: Access via IIS

**On the VPS:**
```
http://localhost
```

**From your local machine:**
```
http://YOUR_VPS_IP_ADDRESS
```

**Or if you have a domain:**
```
http://your-domain.com
```

---

## Quick Test Commands

### Test 1: Check if Node.js app is responding
```powershell
# On VPS, test localhost:3000
Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing
```

**Expected:** Status code 200

### Test 2: Check if IIS is responding
```powershell
# On VPS, test localhost (port 80)
Invoke-WebRequest -Uri http://localhost -UseBasicParsing
```

**Expected:** Status code 200

### Test 3: Check if port 3000 is listening
```powershell
netstat -ano | findstr :3000
```

**Expected:** Should show `LISTENING` on port 3000

### Test 4: Check if port 80 is listening
```powershell
netstat -ano | findstr :80
```

**Expected:** Should show `LISTENING` on port 80

---

## Troubleshooting

### Issue: Can't access via IIS (port 80), but port 3000 works

**Solution 1: Check IIS Site Status**
- Open IIS Manager
- Check if site is **Started**
- If stopped, right-click → **Start**

**Solution 2: Check web.config**
```powershell
# Verify web.config exists
dir C:\inetpub\wwwroot\algomhoria-admin\web.config
```

**Solution 3: Check ARR Proxy**
- IIS Manager → Server → Application Request Routing Cache
- Server Proxy Settings → Enable proxy ✅

**Solution 4: Check Application Pool**
- IIS Manager → Application Pools
- Find `algomhoria-admin` pool
- Make sure it's **Started**
- If stopped, right-click → **Start**

**Solution 5: Check IIS Logs**
```
C:\inetpub\logs\LogFiles\W3SVC1\
```
Look for recent entries and errors.

---

### Issue: 502 Bad Gateway

**This means IIS can't reach Node.js on port 3000.**

**Solution 1: Verify PM2 is running**
```powershell
pm2 status
```
**Should show:** `online` (green)

**Solution 2: Restart PM2**
```powershell
pm2 restart algomhoria-admin
pm2 logs algomhoria-admin
```

**Solution 3: Check if app is listening on port 3000**
```powershell
netstat -ano | findstr :3000
```

**Solution 4: Check PM2 logs for errors**
```powershell
pm2 logs algomhoria-admin --lines 50
```

---

### Issue: 404 Not Found

**Solution 1: Verify web.config rewrite rules**
- Make sure `web.config` is in the correct location
- Check that rewrite rules are correct

**Solution 2: Check IIS URL Rewrite Module**
- Make sure URL Rewrite Module is installed
- Download: https://www.iis.net/downloads/microsoft/url-rewrite

**Solution 3: Restart IIS**
```powershell
iisreset
```

---

### Issue: Can't access from external network

**Solution 1: Check Windows Firewall**
```powershell
# Allow HTTP (port 80)
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow

# Allow Node.js (port 3000) - if accessing directly
New-NetFirewallRule -DisplayName "Node.js App" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

**Solution 2: Check VPS Firewall**
- If using a cloud provider (Azure, AWS, etc.), check their firewall/security group settings
- Make sure port 80 (and 3000 if needed) is open

**Solution 3: Check IIS Binding**
- IIS Manager → Sites → `algomhoria-admin`
- Right-click → **Edit Bindings**
- Make sure binding is set to **All Unassigned** or your specific IP

---

## Verify Everything Works

### ✅ Checklist:

- [ ] PM2 shows `online` status
- [ ] Can access `http://localhost:3000` on VPS
- [ ] IIS site is **Started**
- [ ] `web.config` exists in project root
- [ ] ARR proxy is enabled
- [ ] Application Pool is **Started**
- [ ] Can access `http://localhost` on VPS (via IIS)
- [ ] Can access from external network (if firewall configured)

---

## Recommended Access Method

**Use IIS (port 80)** for production:
- Standard HTTP port (no need to specify port number)
- Better for domain names
- Can add SSL/HTTPS later
- Standard web server setup

**Use direct Node.js (port 3000)** for:
- Testing/debugging
- Development
- Quick access without IIS configuration

---

## Next Steps

Once you can access the frontend:

1. **Test the application:**
   - Login page
   - Dashboard
   - All features

2. **Configure domain** (if you have one):
   - Point DNS to your VPS IP
   - Update IIS binding with domain name

3. **Set up SSL/HTTPS:**
   - Install SSL certificate
   - Configure HTTPS binding in IIS

4. **Monitor:**
   - `pm2 monit` - Monitor PM2 processes
   - IIS logs - Monitor web requests
   - Check application logs

---

**Your frontend should now be accessible!** 🎉

