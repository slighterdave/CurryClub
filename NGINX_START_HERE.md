# 🚀 CurryClub Nginx Configuration - Start Here

**Problem:** You've deployed changes but can't see them on your website?

**You're in the right place!** This guide will help you configure Nginx properly and fix caching issues.

## 📖 Documentation Quick Links

Choose the guide that matches your needs:

### 🎯 **Just Want to Fix "Not Seeing Changes"?**
→ Start here: **[TROUBLESHOOTING_CHANGES.md](TROUBLESHOOTING_CHANGES.md)**

Quick checklist to fix caching issues and see your latest changes immediately.

### 🔧 **Need to Set Up Nginx from Scratch?**
→ Full guide: **[NGINX_CONFIGURATION.md](NGINX_CONFIGURATION.md)**

Complete step-by-step instructions for installing and configuring Nginx as a reverse proxy, including:
- Installation steps
- Configuration file with no-cache headers
- SSL/HTTPS setup
- Troubleshooting common issues
- Production-ready configuration

### 📦 **Need to Deploy the Application?**
→ Main guide: **[DEPLOYMENT.md](DEPLOYMENT.md)**

Full deployment instructions for EC2 Ubuntu, including:
- Installing Node.js and dependencies
- Building the application
- Running with PM2
- Basic Nginx setup (references NGINX_CONFIGURATION.md for details)

### 🐛 **Specific Issue: Menu Item Not Updating?**
→ Example: **[FIX_DEPLOYED_MENU.md](FIX_DEPLOYED_MENU.md)**

Real-world example of a deployment issue and how to fix it.

## 🎓 Quick Start Scenarios

### Scenario 1: "I deployed 30 minutes ago and still see old content"

1. **Do a hard refresh in your browser:**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **If that doesn't work, SSH to your server:**
   ```bash
   cd /home/ubuntu/CurryClub
   ./deploy.sh
   pm2 restart curryclub
   ```

3. **If using Nginx, restart it:**
   ```bash
   sudo systemctl restart nginx
   ```

4. **Clear browser cache completely and try again**

📖 More details: [TROUBLESHOOTING_CHANGES.md](TROUBLESHOOTING_CHANGES.md)

### Scenario 2: "I don't have Nginx set up yet"

1. **Install Nginx:**
   ```bash
   sudo apt update
   sudo apt install -y nginx
   ```

2. **Follow the complete guide:**
   📖 [NGINX_CONFIGURATION.md](NGINX_CONFIGURATION.md)

3. **Key points to remember:**
   - Configure with no-cache headers (see the guide)
   - Test configuration before restarting: `sudo nginx -t`
   - Open port 80 in your firewall

### Scenario 3: "Nginx is set up but I'm still seeing old content"

Your Nginx might be caching responses. 

1. **Check your Nginx configuration:**
   ```bash
   sudo cat /etc/nginx/sites-available/curryclub
   ```

2. **Compare with the no-cache configuration in:**
   📖 [NGINX_CONFIGURATION.md](NGINX_CONFIGURATION.md) (Step 3)

3. **Update if needed, then:**
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### Scenario 4: "Everything works on :3001 but not on :80"

Your Nginx isn't properly configured or isn't running.

1. **Check if Nginx is running:**
   ```bash
   sudo systemctl status nginx
   ```

2. **Check for errors:**
   ```bash
   sudo tail -50 /var/log/nginx/error.log
   ```

3. **Follow the setup guide:**
   📖 [NGINX_CONFIGURATION.md](NGINX_CONFIGURATION.md)

## 🔑 Key Concepts

### Why You're Not Seeing Changes

There are typically 3 layers of caching:

1. **Browser Cache** (most common)
   - Your browser stores old HTML/CSS/JS files
   - **Fix:** Hard refresh (`Ctrl+Shift+R`) or clear cache

2. **Nginx Cache** (if configured)
   - Nginx stores responses from your Node.js server
   - **Fix:** Use no-cache headers (see NGINX_CONFIGURATION.md)

3. **Old Build Artifacts** (less common)
   - The server wasn't rebuilt after pulling new code
   - **Fix:** Run `./deploy.sh` which rebuilds everything

### How Nginx Helps

```
User Browser (port 80)
    ↓
Nginx (port 80) - reverse proxy
    ↓
Node.js/Express (port 3001)
    ↓
Static files in dist/
```

Benefits:
- ✅ Users access site on standard port 80 (HTTP) or 443 (HTTPS)
- ✅ Can add SSL/TLS certificates
- ✅ Better performance for static files
- ✅ Can configure caching strategically
- ✅ Better security (Node.js not directly exposed)

## 📚 All Documentation Files

| File | Purpose |
|------|---------|
| **[NGINX_CONFIGURATION.md](NGINX_CONFIGURATION.md)** | Complete Nginx setup and configuration guide |
| **[TROUBLESHOOTING_CHANGES.md](TROUBLESHOOTING_CHANGES.md)** | Quick checklist for seeing deployed changes |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | Main EC2 deployment guide |
| **[FIX_DEPLOYED_MENU.md](FIX_DEPLOYED_MENU.md)** | Example of specific deployment issue |
| **[README.md](README.md)** | Development setup and overview |
| **[QUICK_START.md](QUICK_START.md)** | Quick command reference |
| **[SERVER_CLEANUP.md](SERVER_CLEANUP.md)** | Server maintenance guide |

## 💡 Pro Tips

1. **Always use the deploy script:** `./deploy.sh`
   - It ensures everything is done in the correct order
   - Automatically restarts PM2

2. **Test in Incognito first:**
   - Proves whether it's a browser cache issue
   - No extensions or cached data

3. **Check what's actually deployed:**
   ```bash
   cd /home/ubuntu/CurryClub
   git log -1
   ```

4. **Watch logs during deployment:**
   ```bash
   pm2 logs curryclub --lines 0
   ```

5. **Use DevTools Network tab:**
   - See exactly what files are being loaded
   - Check if files are coming from cache
   - Verify response headers

## ⚠️ Common Mistakes

❌ **Editing files directly on the server** instead of deploying from Git
- Changes will be lost on next deployment
- Hard to track what's in production

❌ **Not restarting PM2** after making changes
- Old code keeps running
- `./deploy.sh` does this automatically

❌ **Forgetting to clear browser cache**
- #1 reason for "not seeing changes"
- Always try a hard refresh first

❌ **Not checking if Nginx is actually running**
- `sudo systemctl status nginx`
- Check logs if there are issues

❌ **Configuring Nginx with aggressive caching**
- HTML should never be cached
- See NGINX_CONFIGURATION.md for correct configuration

## 🆘 Need More Help?

If you're still stuck after reading these guides:

1. Check the logs:
   - PM2: `pm2 logs curryclub`
   - Nginx: `sudo tail -f /var/log/nginx/curryclub_error.log`

2. Verify basics:
   - Is PM2 running? `pm2 status`
   - Is Nginx running? `sudo systemctl status nginx`
   - Latest code deployed? `git log -1`

3. Try the nuclear option:
   ```bash
   cd /home/ubuntu/CurryClub
   git pull origin main
   rm -rf node_modules dist
   npm install
   npm run build
   pm2 restart curryclub
   sudo systemctl restart nginx
   ```

4. Clear everything in browser:
   - Clear all cache and cookies
   - Or use Incognito mode

## ✅ Success Checklist

After following the guides, you should have:

- ✅ Nginx installed and running
- ✅ Nginx configured with no-cache headers for HTML
- ✅ Node.js application running on port 3001 with PM2
- ✅ Nginx proxying port 80 to port 3001
- ✅ Application accessible on port 80 (HTTP)
- ✅ Changes visible immediately after deployment + hard refresh
- ✅ Firewall configured properly
- ✅ (Optional) SSL/HTTPS configured with Let's Encrypt

---

**Ready to start?** Choose your path:
- 🎯 **Fix caching issues:** [TROUBLESHOOTING_CHANGES.md](TROUBLESHOOTING_CHANGES.md)
- 🔧 **Set up Nginx:** [NGINX_CONFIGURATION.md](NGINX_CONFIGURATION.md)
- 📦 **Full deployment:** [DEPLOYMENT.md](DEPLOYMENT.md)
