# Quick Domain Setup Guide

## 3 Simple Steps to Publish on Your Domain

### Step 1: Point DNS to Your VPS

1. Log in to your **domain registrar** (GoDaddy, Namecheap, Cloudflare, etc.)
2. Go to **DNS Management**
3. Add/Edit **A Record**:
   - **Name:** `@` (for root domain) or `admin` (for subdomain)
   - **Type:** `A`
   - **Value:** `YOUR_VPS_IP_ADDRESS`
   - **TTL:** `3600`

**Example:**
- Domain: `example.com` → Name: `@`, Value: `45.67.89.123`
- Subdomain: `admin.example.com` → Name: `admin`, Value: `45.67.89.123`

**To find your VPS IP:**
```powershell
ipconfig
# Look for IPv4 Address
```

---

### Step 2: Configure IIS Binding

1. Open **IIS Manager** (`inetmgr`)
2. Expand **Sites** → Click **`algomhoria-admin`**
3. Click **Bindings...** → **Add...**
4. Configure:
   - **Type:** `http`
   - **IP address:** `All Unassigned`
   - **Port:** `80`
   - **Host name:** `your-domain.com` (or `admin.your-domain.com`)
5. Click **OK** → **Close**

---

### Step 3: Open Firewall & Test

```powershell
# Allow HTTP traffic
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow

# Restart PM2
pm2 restart algomhoria-admin
```

**Wait 15-30 minutes** for DNS to propagate, then test:
```
http://your-domain.com
```

---

## That's It! 🎉

Your application should now be accessible via your domain.

**For detailed instructions, SSL setup, and troubleshooting, see:** `IIS_DOMAIN_SETUP.md`

