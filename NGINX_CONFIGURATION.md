# Nginx Configuration Guide for CurryClub

This guide provides detailed steps to configure Nginx as a reverse proxy for the CurryClub application. This is especially important if you're not seeing changes after deploying updates to your server.

## Why Use Nginx?

When you deploy the CurryClub application:
1. The Node.js server runs on port 3001
2. Users typically access the site on port 80 (HTTP) or 443 (HTTPS)
3. Nginx acts as a reverse proxy to forward requests from port 80/443 to port 3001
4. Nginx also helps with caching, SSL/TLS, and serving static files efficiently

## Common Issue: Not Seeing Changes After Deployment

If you've deployed updates but don't see them on your site, this is usually caused by:
1. **Browser cache** - Your browser is showing old cached files
2. **Nginx cache** - Nginx is serving cached responses
3. **Old build artifacts** - The server hasn't been rebuilt with latest code

This guide will help you fix all of these issues.

## Prerequisites

- EC2 Ubuntu instance with the CurryClub application installed
- SSH access to your server
- Application running on port 3001 (default)

## Step 1: Install Nginx

SSH into your EC2 instance and install Nginx:

```bash
# Update package lists
sudo apt update

# Install Nginx
sudo apt install -y nginx

# Verify installation
nginx -v
```

Expected output: `nginx version: nginx/1.x.x`

## Step 2: Stop the Default Nginx Site

```bash
# Disable the default site
sudo unlink /etc/nginx/sites-enabled/default
```

This removes the default "Welcome to nginx" page.

## Step 3: Create Nginx Configuration for CurryClub

Create a new configuration file:

```bash
sudo nano /etc/nginx/sites-available/curryclub
```

Paste the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or EC2 IP address
    
    # Increase client max body size for file uploads (if needed)
    client_max_body_size 10M;
    
    # Root location - proxy to Node.js server
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        
        # WebSocket support (if needed in future)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        # Important headers for proper proxying
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CRITICAL: Disable caching for HTML to ensure updates are visible
        proxy_cache_bypass $http_upgrade;
        proxy_no_cache 1;
        add_header Cache-Control "no-cache, no-store, must-revalidate, private";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
    
    # API routes - proxy with no caching
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Never cache API responses
        proxy_no_cache 1;
        proxy_cache_bypass 1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # Health check endpoint
    location /_health {
        proxy_pass http://localhost:3001;
        access_log off;
    }
    
    # Logging
    access_log /var/log/nginx/curryclub_access.log;
    error_log /var/log/nginx/curryclub_error.log;
}
```

**Important:** Replace `your-domain.com` with:
- Your domain name (e.g., `curryclub.example.com`) if you have one
- Your EC2 public IP address (e.g., `13.49.111.162`) if you don't have a domain
- Or just use `_` as a catch-all (works for any domain/IP)

Save and exit:
- Press `Ctrl+X`
- Press `Y` to confirm
- Press `Enter` to save

## Step 4: Enable the Site

Create a symbolic link to enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/curryclub /etc/nginx/sites-enabled/
```

## Step 5: Test Nginx Configuration

Before restarting Nginx, test the configuration for syntax errors:

```bash
sudo nginx -t
```

Expected output:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

If you see errors, review your configuration file for typos.

## Step 6: Restart Nginx

```bash
# Restart Nginx to apply changes
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx
```

You should see `active (running)` in green.

## Step 7: Configure Firewall

Ensure your firewall allows HTTP traffic:

```bash
# Check if UFW is enabled
sudo ufw status

# If UFW is active, allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# If not enabled yet, you can enable it (optional)
# sudo ufw enable
```

Also ensure your **EC2 Security Group** allows:
- Inbound traffic on port 80 (HTTP)
- Inbound traffic on port 443 (HTTPS) if using SSL
- You can now REMOVE port 3001 from your security group for better security

## Step 8: Verify Everything Works

### Test 1: Check Nginx is Running

```bash
curl http://localhost:80
```

You should see HTML content from your application.

### Test 2: Access from Browser

Open your browser and navigate to:
- `http://your-ec2-ip` (e.g., `http://13.49.111.162`)
- OR `http://your-domain.com` if you have a domain

### Test 3: Check Nginx Logs

If something isn't working:

```bash
# View error logs
sudo tail -f /var/log/nginx/curryclub_error.log

# View access logs
sudo tail -f /var/log/nginx/curryclub_access.log
```

## Seeing Your Latest Changes

After deploying code updates, follow these steps to ensure you see the changes:

### 1. Deploy the Latest Code

```bash
cd /home/ubuntu/CurryClub
./deploy.sh
```

This will:
- Pull latest code from GitHub
- Install dependencies
- Rebuild the application
- Restart PM2

### 2. Clear Server-Side Cache (if any)

```bash
# Restart Nginx to clear any lingering cache
sudo systemctl restart nginx

# Restart PM2 process
pm2 restart curryclub
```

### 3. Clear Browser Cache

**Option A: Hard Refresh (Recommended)**
- **Windows/Linux:** `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac:** `Cmd + Shift + R`

**Option B: Clear All Browser Cache**
- **Chrome/Edge:** 
  1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
  2. Select "Cached images and files"
  3. Choose "All time"
  4. Click "Clear data"

**Option C: Open Incognito/Private Window**
- This bypasses the browser cache entirely

### 4. Verify the Changes

After clearing cache:
1. Open your site in the browser
2. Open Developer Tools (F12)
3. Go to the Network tab
4. Reload the page (F5)
5. Check that files are being fetched fresh (not from cache)

## Troubleshooting

### Issue: Still seeing old content after deployment

**Solution 1: Force clear everything**

```bash
# On server
cd /home/ubuntu/CurryClub
git pull origin main
npm install
npm run build
pm2 restart curryclub
sudo systemctl restart nginx

# In browser
# Do a hard refresh (Ctrl+Shift+R)
```

**Solution 2: Check what version is deployed**

```bash
cd /home/ubuntu/CurryClub
git log -1
cat dist/index.html | grep -i "title"
```

Compare the git commit with what you expect.

### Issue: 502 Bad Gateway

This means Nginx can't connect to your Node.js server.

**Check if Node.js is running:**

```bash
pm2 status
```

If it's not running, start it:

```bash
cd /home/ubuntu/CurryClub
pm2 start server.js --name curryclub
```

**Check the port:**

```bash
sudo lsof -i :3001
```

You should see node.js listening on port 3001.

### Issue: 404 Not Found on page refresh

This is a common issue with Single Page Applications (SPAs).

The configuration above already handles this by proxying all requests to Node.js, which serves `index.html` for all routes. If you still have issues, ensure your `server.js` has:

```javascript
// This should be in server.js (it already is)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});
```

### Issue: Changes work on :3001 but not on :80

This means Nginx isn't properly configured or isn't running.

```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx configuration
sudo nginx -t

# View Nginx error logs
sudo tail -50 /var/log/nginx/curryclub_error.log
```

## Optional: Set Up HTTPS with Let's Encrypt

Once HTTP is working, you can add HTTPS:

### 1. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Obtain SSL Certificate

**Important:** You need a domain name for this. It won't work with just an IP address.

```bash
sudo certbot --nginx -d your-domain.com
```

Follow the prompts:
- Enter your email
- Agree to terms of service
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### 3. Test Auto-Renewal

```bash
sudo certbot renew --dry-run
```

Certbot will automatically renew your certificate before it expires.

### 4. Update Security Group

Make sure port 443 is open in your EC2 Security Group.

## Configuration for Production

For a production environment, consider this enhanced configuration:

```nginx
# /etc/nginx/sites-available/curryclub

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

server {
    listen 80;
    server_name your-domain.com;
    
    client_max_body_size 10M;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Root location
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # No caching for HTML
        proxy_cache_bypass $http_upgrade;
        proxy_no_cache 1;
        add_header Cache-Control "no-cache, no-store, must-revalidate, private";
    }
    
    # API with rate limiting
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        proxy_no_cache 1;
        add_header Cache-Control "no-cache";
    }
    
    # Health check
    location /_health {
        proxy_pass http://localhost:3001;
        access_log off;
    }
    
    access_log /var/log/nginx/curryclub_access.log;
    error_log /var/log/nginx/curryclub_error.log;
}
```

## Quick Reference

### View Nginx Status

```bash
sudo systemctl status nginx
```

### Restart Nginx

```bash
sudo systemctl restart nginx
```

### Test Configuration

```bash
sudo nginx -t
```

### View Logs

```bash
# Error logs
sudo tail -f /var/log/nginx/curryclub_error.log

# Access logs
sudo tail -f /var/log/nginx/curryclub_access.log

# All Nginx errors
sudo tail -f /var/log/nginx/error.log
```

### Common Commands

```bash
# Start Nginx
sudo systemctl start nginx

# Stop Nginx
sudo systemctl stop nginx

# Restart Nginx
sudo systemctl restart nginx

# Reload configuration without downtime
sudo systemctl reload nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

## Summary

After following this guide, your setup should be:

1. ✅ Nginx installed and running on port 80
2. ✅ Node.js/PM2 running CurryClub on port 3001
3. ✅ Nginx proxying requests from port 80 to port 3001
4. ✅ No caching enabled (you'll see changes immediately)
5. ✅ Browser cache cleared (you can see latest changes)

Now when you deploy changes with `./deploy.sh`, you should see them immediately after a hard refresh in your browser.

## Related Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Main deployment guide
- **[FIX_DEPLOYED_MENU.md](FIX_DEPLOYED_MENU.md)** - Specific menu deployment fix
- **[QUICK_START.md](QUICK_START.md)** - Quick reference commands

## Need Help?

If you're still not seeing changes:

1. Check PM2 is running: `pm2 status`
2. Check Node.js server logs: `pm2 logs curryclub`
3. Check Nginx logs: `sudo tail -f /var/log/nginx/curryclub_error.log`
4. Verify dist directory was rebuilt: `ls -la /home/ubuntu/CurryClub/dist/`
5. Check git commit matches expected: `cd /home/ubuntu/CurryClub && git log -1`
